import type {
  Channel,
  Conversation,
  Json,
  Message,
  MessageAuthor,
} from '@/lib/database.types';
import type { OutboundPayload } from '@/lib/schemas/message';
import { describePayload } from '@/lib/schemas/message';
import { adaptToCapabilities, ChannelSendError, type SendResult } from '@/server/channels/types';
import { adapterFor } from '@/server/channels/registry';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * The single path every outbound message takes.
 *
 * Persist first, then send, then record the outcome — so a message that fails
 * mid-send is still visible in the Inbox with its error, rather than vanishing.
 */

export class ServiceWindowError extends Error {
  constructor(readonly conversationId: string) {
    super(
      'The 24-hour customer service window has closed for this conversation. ' +
        'Only an approved template message can be sent until the customer writes again.'
    );
    this.name = 'ServiceWindowError';
  }
}

/**
 * Meta only allows free-form messages within 24 hours of the customer's last
 * message. Outside it, nothing but a pre-approved template gets through.
 *
 * This is the most common silent failure in WhatsApp products, so it is checked
 * before sending and raised as a real error rather than left to the API.
 */
export function assertWithinServiceWindow(
  conversation: Pick<Conversation, 'id' | 'window_expires_at'>,
  payload: OutboundPayload,
  channel: Pick<Channel, 'type'>
): void {
  const { serviceWindow } = adapterFor(channel.type).capabilities;
  if (!serviceWindow) return;
  if (payload.type === 'template') return;

  const expiresAt = conversation.window_expires_at
    ? new Date(conversation.window_expires_at)
    : null;

  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    throw new ServiceWindowError(conversation.id);
  }
}

export interface SendOptions {
  conversation: Conversation;
  channel: Channel;
  /** Platform id of the customer: wa_id, IG-scoped id, or PSID. */
  recipientExternalId: string;
  payload: OutboundPayload;
  author: MessageAuthor;
  authorUserId?: string | null;
}

export async function sendMessage(
  ctx: WorkspaceContext,
  options: SendOptions
): Promise<Message> {
  const { conversation, channel, recipientExternalId, author } = options;

  assertWithinServiceWindow(conversation, options.payload, channel);

  // Reshape anything the channel cannot render — see adaptToCapabilities.
  const adapter = adapterFor(channel.type);
  const payload = adaptToCapabilities(options.payload, adapter.capabilities);

  // Send first, then record the outcome in a single write.
  //
  // Persisting as 'queued' and updating afterwards cost two round trips
  // (~530ms) for every message the bot sends, which the customer waits through.
  // The failure this ordering trades away is a crash between send and insert,
  // which would lose the record of a delivered message. That is why the raw
  // payload is already durable in webhook_deliveries for inbound, and why any
  // channel whose send is not idempotent should revisit this.
  let sendResult: SendResult | null = null;
  let failure: string | null = null;

  try {
    sendResult = await adapter.send(channel, recipientExternalId, payload);
  } catch (cause) {
    failure = cause instanceof ChannelSendError ? cause.message : String(cause);
  }

  const { data: message, error: insertError } = await ctx
    .table('messages')
    .insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      author,
      author_user_id: options.authorUserId ?? null,
      payload: payload as unknown as Json,
      status: failure ? 'failed' : 'sent',
      external_id: sendResult?.externalId ?? null,
      error: failure?.slice(0, 1000) ?? null,
      sent_at: failure ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !message) {
    throw new Error(`Could not persist outbound message: ${insertError?.message}`);
  }

  // The message row exists either way, so the Inbox shows the failure rather
  // than the message silently vanishing.
  if (failure) throw new ChannelSendError(failure, false);

  return message as Message;
}

/** Preview text for the conversation list. */
export function previewOf(payload: OutboundPayload): string {
  return describePayload(payload).slice(0, 160);
}
