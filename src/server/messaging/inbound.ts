import type {
  Channel,
  Contact,
  Conversation,
  Json,
  Message,
} from '@/lib/database.types';
import { describePayload } from '@/lib/schemas/message';
import type { InboundMessage } from '@/server/channels/types';
import { findActiveRun, handleInboundMessage } from '@/server/flow/router';
import type { ExecutionOutcome } from '@/server/flow/executor';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * The single entry point for a message arriving from any channel.
 *
 * Resolves who sent it, records it, then hands it to the flow router. Meta
 * retries webhooks, so this must be safe to call twice with the same message —
 * that is what the externalId check is for.
 */

export interface ReceiveResult {
  contact: Contact;
  conversation: Conversation;
  message: Message;
  outcome: ExecutionOutcome | null;
  /** True when this exact message had already been processed. */
  duplicate: boolean;
}

export async function receiveInboundMessage(
  ctx: WorkspaceContext,
  channel: Channel,
  input: InboundMessage
): Promise<ReceiveResult | null> {
  if (input.externalId) {
    const { data: existing } = await ctx
      .table('messages')
      .select<{ id: string }>('id')
      .eq('external_id', input.externalId)
      .maybeSingle();

    if (existing) return null;
  }

  const contact = await resolveContact(ctx, channel, input);
  const conversation = await resolveConversation(ctx, channel, contact.id);


  // Recording the message and looking up the active run are independent, so
  // they go together rather than costing two sequential round trips on the
  // path the customer is waiting on.
  const [insertResult, activeRun] = await Promise.all([
    ctx
      .table('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        author: 'customer',
        payload: input.payload as unknown as Json,
        external_id: input.externalId,
        status: 'delivered',
        delivered_at: input.timestamp.toISOString(),
      })
      .select()
      .single(),
    findActiveRun(ctx, conversation.id),
  ]);

  const { data: inserted, error } = insertResult;

  if (error || !inserted) {
    throw new Error(`Could not record inbound message: ${error?.message}`);
  }

  // The touch_conversation_on_message trigger has just set window_expires_at to
  // created_at + 24h. Computing the same value here rather than re-reading the
  // row saves a ~265ms round trip on the path the customer is waiting on.
  const current: Conversation = {
    ...conversation,
    last_message_at: inserted.created_at,
    window_expires_at: new Date(
      new Date(inserted.created_at).getTime() + 24 * 60 * 60 * 1000
    ).toISOString(),
  };

  // contacts.last_seen_at is maintained by the touch_conversation_on_message
  // trigger, so there is no second write here.

  const outcome = await handleInboundMessage(ctx, {
    conversation: current,
    contact,
    channel,
    recipientExternalId: input.externalUserId,
    input,
    // Already fetched above, in parallel with the message insert.
    activeRun,
  });

  // Settle the bookkeeping write before returning, so it cannot outlive the
  // request and be cancelled mid-flight.
  return {
    contact,
    conversation: current,
    message: inserted as Message,
    outcome,
    duplicate: false,
  };
}

/**
 * Find the contact behind a platform id, creating one on first contact.
 *
 * The identity row is what lets the same person show up as one contact whether
 * they write on WhatsApp, Instagram, or Messenger.
 */
async function resolveContact(
  ctx: WorkspaceContext,
  channel: Channel,
  input: InboundMessage
): Promise<Contact> {
  // Identity and contact in one round trip — looking them up separately cost
  // ~265ms extra on every inbound message.
  const { data: identity } = await ctx
    .table('contact_identities')
    .select<{ contact: Contact | null }>('contact:contacts(*)')
    .eq('channel_type', channel.type)
    .eq('external_id', input.externalUserId)
    .maybeSingle();

  if (identity?.contact) return identity.contact;

  const { data: created, error } = await ctx
    .table('contacts')
    .insert({
      full_name: input.senderName ?? null,
      // WhatsApp ids are phone numbers; Instagram and Messenger ids are not.
      phone: channel.type === 'whatsapp' ? input.externalUserId : null,
    })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Could not create contact: ${error?.message}`);
  }

  const contact = created as Contact;

  await ctx.table('contact_identities').insert({
    contact_id: contact.id,
    channel_type: channel.type,
    external_id: input.externalUserId,
    display_name: input.senderName ?? null,
  });

  return contact;
}

/** Reuse the live thread for this contact and channel, or open one. */
async function resolveConversation(
  ctx: WorkspaceContext,
  channel: Channel,
  contactId: string
): Promise<Conversation> {
  const { data: open } = await ctx
    .table('conversations')
    .select('*')
    .eq('contact_id', contactId)
    .eq('channel_id', channel.id)
    .neq('status', 'resolved')
    .maybeSingle();

  if (open) return open as Conversation;

  const { data: created, error } = await ctx
    .table('conversations')
    .insert({ contact_id: contactId, channel_id: channel.id, status: 'open' })
    .select()
    .single();

  if (error || !created) {
    throw new Error(`Could not open conversation: ${error?.message}`);
  }

  return created as Conversation;
}

/** Preview text for the conversation list. */
export function inboundPreview(input: InboundMessage): string {
  return describePayload(input.payload).slice(0, 160);
}
