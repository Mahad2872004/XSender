'use server';

import { revalidatePath } from 'next/cache';
import type { OrderStatus } from '@/lib/database.types';
import { requireWorkspace } from '@/server/auth/session';
import { loadOrder, setOrderStatus, statusMessage } from '@/server/domain/orders';
import { sendMessage } from '@/server/messaging/outbound';
import type { Conversation, Channel } from '@/lib/database.types';

/**
 * Advancing an order's status is the moment the automation earns its keep:
 * one tap here sends the customer their update, with nobody typing it.
 */
export async function advanceOrder(orderId: string, status: OrderStatus): Promise<void> {
  const ctx = await requireWorkspace();

  const order = await setOrderStatus(ctx, orderId, status);
  const text = statusMessage(order, status);

  if (text && order.conversation_id) {
    // The update is a courtesy, not the point of the action. If the customer's
    // 24-hour window has closed or the channel rejects it, the status change
    // still stands and the failure is visible on the message row.
    try {
      const [conversationResult, contactIdentity] = await Promise.all([
        ctx.table('conversations').select().eq('id', order.conversation_id).maybeSingle(),
        ctx
          .table('contact_identities')
          .select<{ external_id: string; channel_type: string }>('external_id, channel_type')
          .eq('contact_id', order.contact_id)
          .maybeSingle(),
      ]);

      const conversation = conversationResult.data as Conversation | null;

      if (conversation && contactIdentity.data) {
        const { data: channel } = await ctx
          .table('channels')
          .select()
          .eq('id', conversation.channel_id)
          .maybeSingle();

        if (channel) {
          await sendMessage(ctx, {
            conversation,
            channel: channel as Channel,
            recipientExternalId: contactIdentity.data.external_id,
            payload: { type: 'text', text },
            author: 'system',
          });
        }
      }
    } catch {
      // Swallowed deliberately — see the comment above. The message row carries
      // the error for the Inbox to show.
    }
  }

  revalidatePath('/orders');
  revalidatePath('/');
}

export async function cancelOrder(orderId: string): Promise<void> {
  await advanceOrder(orderId, 'cancelled');
}

/** Read-only helper for the detail drawer. */
export async function getOrder(orderId: string) {
  const ctx = await requireWorkspace();
  return loadOrder(ctx, orderId);
}
