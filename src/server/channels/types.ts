import type { Channel, ChannelType } from '@/lib/database.types';
import type { MessagePayload, OutboundPayload } from '@/lib/schemas/message';

/**
 * The one interface every messaging surface implements.
 *
 * The flow engine talks only to this, which is why adding Instagram and
 * Messenger in Phase 4 is a new adapter rather than a change to the engine —
 * and why the Simulator can drive the real engine in Phase 1 with no Meta
 * account at all.
 */

/** What a channel can actually render. The engine degrades gracefully on the rest. */
export interface ChannelCapabilities {
  /** Native tappable buttons (WhatsApp: 3; Messenger quick replies: 13). */
  buttons: boolean;
  maxButtons: number;
  /** Scrollable single-select list (WhatsApp only). */
  lists: boolean;
  media: boolean;
  location: boolean;
  /** Pre-approved templates, required outside the 24-hour window. */
  templates: boolean;
  /** Whether a 24-hour customer service window applies at all. */
  serviceWindow: boolean;
}

/** A message received from a customer, normalised. */
export interface InboundMessage {
  /** Platform message id; used to make duplicate webhook delivery a no-op. */
  externalId: string | null;
  /** Platform-scoped sender id: wa_id, IG-scoped id, or Messenger PSID. */
  externalUserId: string;
  channelType: ChannelType;
  payload: MessagePayload;
  /** Profile name the platform supplied, when it does. */
  senderName?: string;
  timestamp: Date;
}

export interface SendResult {
  /** Platform message id, when the channel returns one synchronously. */
  externalId: string | null;
}

export class ChannelSendError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ChannelSendError';
  }
}

export interface ChannelAdapter {
  readonly type: ChannelType;
  readonly capabilities: ChannelCapabilities;

  /**
   * Deliver a message. Implementations must throw ChannelSendError with
   * `retryable` set honestly — the queue's backoff depends on it, and retrying
   * a permanent failure (invalid token, blocked user) just burns quota.
   */
  send(channel: Channel, recipientExternalId: string, payload: OutboundPayload): Promise<SendResult>;
}

/**
 * Rework a payload the channel cannot render natively.
 *
 * WhatsApp has real buttons and lists; Messenger has quick replies but no
 * lists; a plain-text channel has neither. Rather than fail, collapse the
 * options into a numbered prompt — the customer can still answer, and
 * matchNumberedChoice() below maps their reply back to the original option id.
 */
export function adaptToCapabilities(
  payload: OutboundPayload,
  capabilities: ChannelCapabilities
): OutboundPayload {
  if (payload.type === 'buttons') {
    if (capabilities.buttons && payload.buttons.length <= capabilities.maxButtons) {
      return payload;
    }
    return numberedPrompt(
      payload.text,
      payload.buttons.map((b) => b.title)
    );
  }

  if (payload.type === 'list') {
    if (capabilities.lists) return payload;

    const rows = payload.sections.flatMap((s) => s.rows);
    if (capabilities.buttons && rows.length <= capabilities.maxButtons) {
      return {
        type: 'buttons',
        text: payload.text,
        buttons: rows.map((r) => ({ id: r.id, title: r.title.slice(0, 20) })),
      };
    }
    return numberedPrompt(
      payload.text,
      rows.map((r) => r.title)
    );
  }

  return payload;
}

function numberedPrompt(text: string, titles: string[]): OutboundPayload {
  const lines = titles.map((title, i) => `${i + 1}. ${title}`);
  return {
    type: 'text',
    text: `${text}\n\n${lines.join('\n')}\n\nReply with a number.`,
  };
}

/**
 * Map a reply back to an option id when the options were flattened into a
 * numbered list. Accepts the number ("2") or the option's own text.
 */
export function matchNumberedChoice(
  reply: string,
  options: Array<{ id: string; title: string }>
): string | null {
  const trimmed = reply.trim();

  const asNumber = Number.parseInt(trimmed, 10);
  if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
    return options[asNumber - 1].id;
  }

  const lowered = trimmed.toLowerCase();
  const byTitle = options.find((o) => o.title.toLowerCase() === lowered);
  if (byTitle) return byTitle.id;

  const byId = options.find((o) => o.id.toLowerCase() === lowered);
  return byId?.id ?? null;
}
