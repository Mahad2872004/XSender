'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Channel, Conversation, Json } from '@/lib/database.types';
import { APP } from '@/lib/routes';
import { requireWorkspace } from '@/server/auth/session';
import { ChannelSendError } from '@/server/channels/types';
import { cancelActiveRun } from '@/server/flow/router';
import { recipientFor } from '@/server/inbox/service';
import { sendMessage, ServiceWindowError } from '@/server/messaging/outbound';
import type { InboxActionState } from './form-state';

/**
 * Agent actions on a conversation.
 *
 * Taking over cancels the active flow run rather than leaving it parked: two
 * things typing into the same thread is the worst possible outcome, and a
 * customer being answered twice reads as broken.
 */

const replyInput = z.object({
  conversationId: z.string().uuid(),
  text: z.string().trim().min(1, 'Type something to send.').max(4096),
});

async function loadConversation(
  ctx: Awaited<ReturnType<typeof requireWorkspace>>,
  conversationId: string
): Promise<{ conversation: Conversation; channel: Channel } | null> {
  const { data: conversation } = await ctx
    .table('conversations')
    .select()
    .eq('id', conversationId)
    .maybeSingle();

  if (!conversation) return null;

  const { data: channel } = await ctx
    .table('channels')
    .select()
    .eq('id', conversation.channel_id)
    .maybeSingle();

  if (!channel) return null;
  return { conversation, channel };
}

export async function sendReply(
  _prev: InboxActionState,
  formData: FormData
): Promise<InboxActionState> {
  const raw = String(formData.get('text') ?? '');
  const parsed = replyInput.safeParse({
    conversationId: formData.get('conversationId'),
    text: raw,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Could not send that.', attempted: raw };
  }

  const ctx = await requireWorkspace();
  ctx.requireRole('agent');

  const loaded = await loadConversation(ctx, parsed.data.conversationId);
  if (!loaded) return { error: 'That conversation no longer exists.', attempted: raw };

  const recipient = await recipientFor(ctx, loaded.conversation, loaded.channel.type);
  if (!recipient) {
    return { error: 'No contact address for this conversation.', attempted: raw };
  }

  try {
    await sendMessage(ctx, {
      conversation: loaded.conversation,
      channel: loaded.channel,
      recipientExternalId: recipient,
      payload: { type: 'text', text: parsed.data.text },
      author: 'agent',
      authorUserId: ctx.userId === 'system' ? null : ctx.userId,
    });
  } catch (cause) {
    // The 24-hour window is the common case and deserves plain language rather
    // than a Graph API code.
    if (cause instanceof ServiceWindowError) {
      return {
        error:
          'This customer last wrote more than 24 hours ago. WhatsApp only allows an approved template until they message again.',
        attempted: raw,
      };
    }
    return {
      error: cause instanceof ChannelSendError ? cause.message : 'Could not send that message.',
      attempted: raw,
    };
  }

  revalidatePath(APP.inbox);
  return { error: null };
}

/** Claim a conversation: stop the bot, mark it as a person's problem. */
export async function takeOver(conversationId: string): Promise<void> {
  const ctx = await requireWorkspace();
  ctx.requireRole('agent');

  await cancelActiveRun(ctx, conversationId, 'an agent took over');

  await ctx
    .table('conversations')
    .update({
      needs_human: true,
      status: 'pending',
      assigned_to: ctx.userId === 'system' ? null : ctx.userId,
    })
    .eq('id', conversationId);

  await ctx.table('events').insert({
    type: 'conversation.taken_over',
    entity_type: 'conversation',
    entity_id: conversationId,
    actor_user_id: ctx.userId === 'system' ? null : ctx.userId,
    payload: {} as Json,
  });

  revalidatePath(APP.inbox);
}

/**
 * Hand the thread back to automation.
 *
 * The next inbound message starts a fresh run, because the previous one was
 * cancelled when the agent stepped in — mid-conversation state does not survive
 * a human interruption, and pretending otherwise would resume a flow against
 * answers the customer has since changed.
 */
export async function handBackToBot(conversationId: string): Promise<void> {
  const ctx = await requireWorkspace();
  ctx.requireRole('agent');

  await ctx
    .table('conversations')
    .update({ needs_human: false, status: 'open', assigned_to: null })
    .eq('id', conversationId);

  await ctx.table('events').insert({
    type: 'conversation.returned_to_bot',
    entity_type: 'conversation',
    entity_id: conversationId,
    actor_user_id: ctx.userId === 'system' ? null : ctx.userId,
    payload: {} as Json,
  });

  revalidatePath(APP.inbox);
}

export async function resolveConversation(conversationId: string): Promise<void> {
  const ctx = await requireWorkspace();
  ctx.requireRole('agent');

  await cancelActiveRun(ctx, conversationId, 'conversation resolved');
  await ctx
    .table('conversations')
    .update({ status: 'resolved', needs_human: false, unread_count: 0 })
    .eq('id', conversationId);

  revalidatePath(APP.inbox);
}

/** Clear the unread badge when a thread is opened. */
export async function markRead(conversationId: string): Promise<void> {
  const ctx = await requireWorkspace();
  await ctx.table('conversations').update({ unread_count: 0 }).eq('id', conversationId);
}
