import {
  AskQuestionConfigSchema,
  SendMessageConfigSchema,
  TriggerNodeConfigSchema,
} from '@/lib/schemas/flow';
import { inboundMatchValue } from '@/lib/schemas/message';
import { parseCustomerDate } from '@/lib/parse-date';
import { formatInZone, parseDateString, zonedTimeToUtc } from '@/lib/timezone';
import type { OutboundPayload } from '@/lib/schemas/message';
import { matchNumberedChoice } from '@/server/channels/types';
import type { NodeDefinition } from '../node-types';
import { renderTemplate } from '../template';

/** Entry point. Does nothing but hand control to the next node. */
export const triggerNode: NodeDefinition<typeof TriggerNodeConfigSchema> = {
  type: 'trigger',
  configSchema: TriggerNodeConfigSchema,
  category: 'trigger',
  label: 'Trigger',
  description: 'Where the flow starts when an inbound message matches.',
  async enter() {
    return { kind: 'advance' };
  },
};

export const sendMessageNode: NodeDefinition<typeof SendMessageConfigSchema> = {
  type: 'send_message',
  configSchema: SendMessageConfigSchema,
  category: 'message',
  label: 'Send message',
  description: 'Send text, media, or an approved template. Does not wait for a reply.',

  async enter(config, runtime) {
    const { body } = config;

    if (body.kind === 'text') {
      runtime.send({ type: 'text', text: renderTemplate(body.text, runtime.variables) });
    } else if (body.kind === 'media') {
      runtime.send({
        type: body.mediaType,
        mediaUrl: body.mediaUrl,
        caption: body.caption
          ? renderTemplate(body.caption, runtime.variables)
          : undefined,
      });
    } else {
      runtime.send({
        type: 'template',
        name: body.templateName,
        language: body.language,
        // Template variables interpolate too, so a utility template can carry
        // the order code the flow just generated.
        variables: Object.fromEntries(
          Object.entries(body.variables).map(([key, value]) => [
            key,
            renderTemplate(value, runtime.variables),
          ])
        ),
      });
    }

    return { kind: 'advance' };
  },
};

export const askQuestionNode: NodeDefinition<typeof AskQuestionConfigSchema> = {
  type: 'ask_question',
  configSchema: AskQuestionConfigSchema,
  category: 'message',
  label: 'Ask a question',
  description: 'Ask something, save the answer, and branch on it.',

  async enter(config, runtime) {
    const prompt = renderTemplate(config.prompt, runtime.variables);
    const { expects } = config;

    let payload: OutboundPayload;
    let options: Array<{ id: string; title: string }> | undefined;

    if (expects.kind === 'buttons') {
      payload = { type: 'buttons', text: prompt, buttons: expects.buttons };
      options = expects.buttons;
    } else if (expects.kind === 'list') {
      payload = {
        type: 'list',
        text: prompt,
        buttonLabel: expects.buttonLabel,
        sections: expects.sections,
      };
      options = expects.sections.flatMap((s) =>
        s.rows.map((r) => ({ id: r.id, title: r.title }))
      );
    } else {
      payload = { type: 'text', text: prompt };
    }

    runtime.send(payload);

    return {
      kind: 'await',
      awaiting: {
        // Filled in by the executor, which knows the node's own id.
        nodeId: '',
        kind: expects.kind,
        options,
        attempts: 0,
      },
    };
  },

  async resume(config, runtime, input, awaiting) {
    const raw = inboundMatchValue(input.payload);
    const parsed = interpret(
      config.expects,
      raw,
      input,
      awaiting.options,
      runtime.ctx.workspace.locale || 'en-US',
      runtime.ctx.workspace.timezone || 'UTC'
    );

    if (!parsed.ok) {
      const attempts = awaiting.attempts + 1;
      runtime.note({ invalidAnswer: raw, reason: parsed.reason, attempts });

      // Out of patience: take the fallback edge so the flow can hand off
      // rather than loop at the customer forever.
      if (attempts >= config.maxAttempts) {
        return { kind: 'advance', handle: 'fallback' };
      }

      runtime.send({
        type: 'text',
        text: config.retryMessage
          ? renderTemplate(config.retryMessage, runtime.variables)
          : parsed.reason,
      });

      return {
        kind: 'await',
        awaiting: { ...awaiting, attempts },
      };
    }

    runtime.setVariable(config.saveAs, parsed.value);

    // Read an ambiguous date back before moving on. Cheaper than a wrong
    // appointment, and the customer can correct it in the next message.
    if (parsed.confirm) {
      runtime.send({ type: 'text', text: `Got it — ${parsed.confirm}.` });
      runtime.note({ confirmedReading: parsed.confirm });
    }

    // A chosen option branches on its own id; free-text answers take 'next'.
    const handle = parsed.optionId ?? 'next';
    return { kind: 'advance', handle };
  },
};

type Interpreted =
  | {
      ok: true;
      value: unknown;
      optionId?: string;
      /** Human reading of the answer, sent back when it could be misread. */
      confirm?: string;
    }
  | { ok: false; reason: string };

/** Validate and coerce the customer's answer against what the question expects. */
function interpret(
  expects: (typeof AskQuestionConfigSchema)['_output']['expects'],
  raw: string,
  input: Parameters<NonNullable<typeof askQuestionNode.resume>>[2],
  options: Array<{ id: string; title: string }> | undefined,
  locale: string,
  timeZone: string
): Interpreted {
  switch (expects.kind) {
    case 'text':
      return raw.length > 0
        ? { ok: true, value: raw }
        : { ok: false, reason: 'Please send a short reply.' };

    case 'number': {
      const n = Number(raw.replace(/[^\d.-]/g, ''));
      if (!Number.isFinite(n)) return { ok: false, reason: 'Please reply with a number.' };
      if (expects.min !== undefined && n < expects.min) {
        return { ok: false, reason: `Please enter a number of at least ${expects.min}.` };
      }
      if (expects.max !== undefined && n > expects.max) {
        return { ok: false, reason: `Please enter a number no more than ${expects.max}.` };
      }
      return { ok: true, value: n };
    }

    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
        ? { ok: true, value: raw.toLowerCase() }
        : { ok: false, reason: 'That does not look like an email address.' };

    case 'phone': {
      const digits = raw.replace(/[^\d+]/g, '');
      return digits.length >= 7
        ? { ok: true, value: digits }
        : { ok: false, reason: 'Please send a valid phone number.' };
    }

    case 'date': {
      // Never `new Date(raw)`: it reads "03/04/2026" as 4 March regardless of
      // who typed it, so a customer outside the US silently gets an
      // appointment a month away.
      const parsed = parseCustomerDate(raw, { locale, timeZone });
      if (!parsed) {
        return {
          ok: false,
          reason: 'Sorry, I did not catch that date. Try something like “14 Aug” or “tomorrow”.',
        };
      }

      const instant = zonedTimeToUtc(timeZone, {
        ...parseDateString(parsed.date)!,
        hour: Math.floor((parsed.minutes ?? 0) / 60),
        minute: (parsed.minutes ?? 0) % 60,
      });

      return {
        ok: true,
        value: instant.toISOString(),
        // Read the date back when the day/month order had to be guessed, so a
        // misreading is caught by the customer rather than at the door.
        confirm: parsed.ambiguous
          ? formatInZone(instant, timeZone, locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : undefined,
      };
    }

    case 'location':
      return input.payload.type === 'location'
        ? {
            ok: true,
            value: {
              latitude: input.payload.latitude,
              longitude: input.payload.longitude,
              address: input.payload.address ?? null,
            },
          }
        : { ok: false, reason: 'Please share your location using the attachment button.' };

    case 'buttons':
    case 'list': {
      const available = options ?? [];
      // A tapped option arrives as its id; a typed reply may be a number or the
      // option's text, which matchNumberedChoice resolves.
      const direct = available.find((o) => o.id === raw);
      const optionId = direct?.id ?? matchNumberedChoice(raw, available);

      if (!optionId) {
        return { ok: false, reason: 'Please pick one of the options above.' };
      }

      const chosen = available.find((o) => o.id === optionId);
      return { ok: true, value: chosen?.title ?? optionId, optionId };
    }

    default:
      return { ok: false, reason: 'Sorry, I did not understand that.' };
  }
}
