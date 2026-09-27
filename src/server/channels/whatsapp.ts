import type { Channel } from '@/lib/database.types';
import type { MessagePayload, OutboundPayload } from '@/lib/schemas/message';
import { channelToken, graphCall } from '@/server/meta/graph';
import {
  ChannelSendError,
  type ChannelAdapter,
  type ChannelCapabilities,
  type InboundMessage,
  type InboundStatus,
  type NormalizedWebhook,
  type SendResult,
} from './types';

/**
 * WhatsApp Cloud API.
 *
 * The first real channel. Capabilities mirror what the Cloud API actually
 * allows — three interactive buttons, ten list rows — because those limits are
 * what `adaptToCapabilities` uses to decide when to collapse a prompt into a
 * numbered list rather than have Meta reject it.
 */

interface SendResponse {
  messages?: Array<{ id: string }>;
}

export class WhatsAppAdapter implements ChannelAdapter {
  readonly type = 'whatsapp' as const;

  readonly capabilities: ChannelCapabilities = {
    buttons: true,
    maxButtons: 3,
    lists: true,
    media: true,
    location: true,
    templates: true,
    // The 24-hour window is real here, and enforced before we ever get called.
    serviceWindow: true,
  };

  async send(
    channel: Channel,
    recipientExternalId: string,
    payload: OutboundPayload
  ): Promise<SendResult> {
    if (!channel.phone_number_id) {
      throw new ChannelSendError(
        `Channel "${channel.display_name}" has no phone number id. Reconnect it.`,
        false
      );
    }

    const response = await graphCall<SendResponse>({
      path: `${channel.phone_number_id}/messages`,
      token: channelToken(channel),
      body: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientExternalId,
        ...toWhatsAppBody(payload),
      },
    });

    return { externalId: response.messages?.[0]?.id ?? null };
  }

  normalizeWebhook(body: unknown): NormalizedWebhook {
    return normalizeWhatsAppWebhook(body);
  }
}

export const whatsappAdapter = new WhatsAppAdapter();

// ---------------------------------------------------------------------------
// Outbound
// ---------------------------------------------------------------------------

/** Our payload shape → the Cloud API's message object. */
function toWhatsAppBody(payload: OutboundPayload): Record<string, unknown> {
  switch (payload.type) {
    case 'text':
      // preview_url off: a link in an order confirmation should not pull a
      // large unrelated preview card into the thread.
      return { type: 'text', text: { body: payload.text, preview_url: false } };

    case 'image':
    case 'video':
    case 'audio':
    case 'document':
      return {
        type: payload.type,
        [payload.type]: {
          link: payload.mediaUrl,
          ...(payload.caption && payload.type !== 'audio' ? { caption: payload.caption } : {}),
          ...(payload.filename && payload.type === 'document'
            ? { filename: payload.filename }
            : {}),
        },
      };

    case 'buttons':
      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: payload.text },
          action: {
            buttons: payload.buttons.map((button) => ({
              type: 'reply',
              // Meta truncates silently past 20 characters, which is worse than
              // truncating deliberately.
              reply: { id: button.id.slice(0, 256), title: button.title.slice(0, 20) },
            })),
          },
        },
      };

    case 'list':
      return {
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: payload.text },
          action: {
            button: payload.buttonLabel.slice(0, 20),
            sections: payload.sections.map((section) => ({
              ...(section.title ? { title: section.title.slice(0, 24) } : {}),
              rows: section.rows.map((row) => ({
                id: row.id.slice(0, 200),
                title: row.title.slice(0, 24),
                ...(row.description ? { description: row.description.slice(0, 72) } : {}),
              })),
            })),
          },
        },
      };

    case 'location':
      return {
        type: 'location',
        location: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.address ? { address: payload.address } : {}),
        },
      };

    case 'template':
      return {
        type: 'template',
        template: {
          name: payload.name,
          language: { code: payload.language },
          components: templateComponents(payload.variables),
        },
      };
  }
}

/**
 * Template variables are positional in the Cloud API — `{{1}}`, `{{2}}` — so
 * named keys are ordered numerically before being sent.
 */
function templateComponents(variables: Record<string, string>) {
  const entries = Object.entries(variables);
  if (entries.length === 0) return [];

  const ordered = entries.sort(([a], [b]) => {
    const numeric = Number(a) - Number(b);
    return Number.isNaN(numeric) ? a.localeCompare(b) : numeric;
  });

  return [
    {
      type: 'body',
      parameters: ordered.map(([, value]) => ({ type: 'text', text: value })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Inbound
// ---------------------------------------------------------------------------

interface WebhookValue {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: WhatsAppInboundMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppInboundMessage {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
  button?: { text?: string; payload?: string };
  image?: MediaPart;
  video?: MediaPart;
  audio?: MediaPart;
  document?: MediaPart & { filename?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
}

interface MediaPart {
  id?: string;
  caption?: string;
  mime_type?: string;
}

interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ title?: string; message?: string; code?: number }>;
}

/** Which Cloud API phone number a webhook body is about, for channel routing. */
export function phoneNumberIdFromWebhook(body: unknown): string | null {
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> })?.entry;
  for (const entry of entries ?? []) {
    for (const change of entry.changes ?? []) {
      const id = change.value?.metadata?.phone_number_id;
      if (id) return id;
    }
  }
  return null;
}

export function normalizeWhatsAppWebhook(body: unknown): NormalizedWebhook {
  const messages: InboundMessage[] = [];
  const statuses: InboundStatus[] = [];

  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: WebhookValue }> }> })?.entry;

  for (const entry of entries ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // Profile names arrive alongside the messages, keyed by wa_id.
      const names = new Map<string, string>();
      for (const contact of value.contacts ?? []) {
        if (contact.wa_id && contact.profile?.name) names.set(contact.wa_id, contact.profile.name);
      }

      for (const raw of value.messages ?? []) {
        const normalized = normalizeMessage(raw, names);
        if (normalized) messages.push(normalized);
      }

      for (const raw of value.statuses ?? []) {
        const normalized = normalizeStatus(raw);
        if (normalized) statuses.push(normalized);
      }
    }
  }

  return { messages, statuses };
}

function normalizeMessage(
  raw: WhatsAppInboundMessage,
  names: Map<string, string>
): InboundMessage | null {
  if (!raw.from) return null;

  const payload = toPayload(raw);
  if (!payload) return null;

  return {
    externalId: raw.id ?? null,
    externalUserId: raw.from,
    channelType: 'whatsapp',
    payload,
    senderName: names.get(raw.from),
    // WhatsApp sends unix seconds; Date wants milliseconds.
    timestamp: raw.timestamp ? new Date(Number(raw.timestamp) * 1000) : new Date(),
  };
}

function toPayload(raw: WhatsAppInboundMessage): MessagePayload | null {
  switch (raw.type) {
    case 'text':
      return raw.text?.body ? { type: 'text', text: raw.text.body } : null;

    case 'interactive': {
      // A tapped button or list row. The engine branches on the id, never the
      // label, so wording can change without breaking a published flow.
      const reply = raw.interactive?.button_reply ?? raw.interactive?.list_reply;
      return reply?.id ? { type: 'reply', replyId: reply.id, title: reply.title ?? reply.id } : null;
    }

    case 'button':
      // A quick-reply button on a template message carries its payload instead.
      return raw.button?.payload
        ? { type: 'reply', replyId: raw.button.payload, title: raw.button.text ?? raw.button.payload }
        : null;

    case 'location':
      return raw.location?.latitude !== undefined && raw.location?.longitude !== undefined
        ? {
            type: 'location',
            latitude: raw.location.latitude,
            longitude: raw.location.longitude,
            ...(raw.location.name ? { name: raw.location.name } : {}),
            ...(raw.location.address ? { address: raw.location.address } : {}),
          }
        : null;

    case 'image':
    case 'video':
    case 'audio':
    case 'document': {
      const media = raw[raw.type] as MediaPart | undefined;
      if (!media?.id) return null;
      return {
        type: raw.type,
        // Media lives behind an authenticated Graph endpoint rather than a
        // public URL. Storing the id keeps the reference; fetching the bytes is
        // a separate concern (Phase 7, with Storage).
        mediaUrl: `https://graph.facebook.com/media/${media.id}`,
        ...(media.caption ? { caption: media.caption } : {}),
      };
    }

    default:
      // Stickers, contacts, reactions, system notices. Recorded so the thread
      // reads correctly and the flow can still hand off rather than stall.
      return { type: 'unsupported', raw: raw.type ?? 'unknown' };
  }
}

function normalizeStatus(raw: WhatsAppStatus): InboundStatus | null {
  if (!raw.id || !raw.status) return null;

  const status =
    raw.status === 'sent' || raw.status === 'delivered' || raw.status === 'read'
      ? raw.status
      : raw.status === 'failed'
        ? 'failed'
        : null;

  if (!status) return null;

  const firstError = raw.errors?.[0];

  return {
    externalId: raw.id,
    status,
    timestamp: raw.timestamp ? new Date(Number(raw.timestamp) * 1000) : new Date(),
    ...(firstError
      ? { error: firstError.message ?? firstError.title ?? `Meta error ${firstError.code}` }
      : {}),
  };
}
