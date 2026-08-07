import { z } from 'zod';

/**
 * Normalised message payloads.
 *
 * One shape across every channel. Adapters translate to and from each
 * platform's wire format, so the flow engine never learns that WhatsApp calls
 * something `interactive.button_reply` and Messenger calls it `quick_reply`.
 *
 * Stored in messages.payload.
 */

export const QuickReplySchema = z.object({
  /** Stable id echoed back when tapped — flows branch on this, not the label. */
  id: z.string().min(1).max(256),
  title: z.string().min(1).max(20), // WhatsApp caps button labels at 20 chars
});
export type QuickReply = z.infer<typeof QuickReplySchema>;

export const ListRowSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(24),
  description: z.string().max(72).optional(),
});

export const ListSectionSchema = z.object({
  title: z.string().max(24).optional(),
  rows: z.array(ListRowSchema).min(1).max(10),
});

const TextPayload = z.object({
  type: z.literal('text'),
  text: z.string().min(1).max(4096),
});

const MediaPayload = z.object({
  type: z.enum(['image', 'video', 'audio', 'document']),
  mediaUrl: z.string().url(),
  caption: z.string().max(1024).optional(),
  filename: z.string().max(255).optional(),
});

/** Up to 3 tappable buttons — WhatsApp's hard limit. */
const ButtonsPayload = z.object({
  type: z.literal('buttons'),
  text: z.string().min(1).max(1024),
  buttons: z.array(QuickReplySchema).min(1).max(3),
});

/** More than 3 options: a scrollable list, up to 10 rows total. */
const ListPayload = z.object({
  type: z.literal('list'),
  text: z.string().min(1).max(1024),
  buttonLabel: z.string().min(1).max(20).default('Choose'),
  sections: z.array(ListSectionSchema).min(1).max(10),
});

const LocationPayload = z.object({
  type: z.literal('location'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().max(200).optional(),
  address: z.string().max(400).optional(),
});

/** Pre-approved WhatsApp template — the only thing sendable outside the 24h window. */
const TemplatePayload = z.object({
  type: z.literal('template'),
  name: z.string().min(1),
  language: z.string().min(2).default('en'),
  variables: z.record(z.string(), z.string()).default({}),
});

/** Inbound only: the customer tapped a button or picked a list row. */
const ReplyPayload = z.object({
  type: z.literal('reply'),
  replyId: z.string().min(1),
  title: z.string().min(1),
});

/** Inbound only: something we received but cannot interpret (sticker, contact card). */
const UnsupportedPayload = z.object({
  type: z.literal('unsupported'),
  raw: z.string().max(2000).optional(),
});

export const MessagePayloadSchema = z.discriminatedUnion('type', [
  TextPayload,
  MediaPayload,
  ButtonsPayload,
  ListPayload,
  LocationPayload,
  TemplatePayload,
  ReplyPayload,
  UnsupportedPayload,
]);

export type MessagePayload = z.infer<typeof MessagePayloadSchema>;
export type OutboundPayload = Exclude<
  MessagePayload,
  { type: 'reply' } | { type: 'unsupported' }
>;

/**
 * The text a flow should match against, whatever arrived.
 *
 * A tapped button yields its id, because branching on a label breaks the moment
 * someone edits the wording.
 */
export function inboundMatchValue(payload: MessagePayload): string {
  switch (payload.type) {
    case 'text':
      return payload.text.trim();
    case 'reply':
      return payload.replyId;
    case 'location':
      return payload.name ?? payload.address ?? 'location';
    default:
      return '';
  }
}

/** Short human-readable form, for conversation previews and the run inspector. */
export function describePayload(payload: MessagePayload): string {
  switch (payload.type) {
    case 'text':
      return payload.text;
    case 'buttons':
    case 'list':
      return payload.text;
    case 'reply':
      return payload.title;
    case 'location':
      return payload.name ?? 'Shared a location';
    case 'template':
      return `Template: ${payload.name}`;
    case 'unsupported':
      return 'Unsupported message';
    default:
      return `[${payload.type}]`;
  }
}
