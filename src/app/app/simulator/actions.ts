'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWorkspace } from '@/server/auth/session';
import {
  resetSimulator,
  sendAsCustomer,
} from '@/server/simulator/service';
import { installFlowTemplate } from '@/server/flow/publish';
import {
  restaurantOrderGraph,
  RESTAURANT_ORDER_ENTRY,
} from '@/server/flow/templates/restaurant-order';

import { EMPTY_SIMULATOR_STATE, type SimulatorActionState } from './form-state';

const textInput = z.object({ text: z.string().trim().min(1).max(4096) });

/** Send a typed message as the simulated customer. */
export async function sendSimulatedText(
  _prev: SimulatorActionState,
  formData: FormData
): Promise<SimulatorActionState> {
  const raw = String(formData.get('text') ?? '');
  const parsed = textInput.safeParse({ text: raw });
  if (!parsed.success) {
    return { error: 'Type something to send.', notice: null, attempted: raw };
  }

  const ctx = await requireWorkspace();

  try {
    await sendAsCustomer(ctx, { type: 'text', text: parsed.data.text });
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Could not send that message.',
      notice: null,
      attempted: parsed.data.text,
    };
  }

  revalidatePath('/app/simulator');
  return EMPTY_SIMULATOR_STATE;
}

/** Tap a button or list row the bot offered. */
export async function tapSimulatedReply(replyId: string, title: string): Promise<void> {
  const ctx = await requireWorkspace();
  await sendAsCustomer(ctx, { type: 'reply', replyId, title });
  revalidatePath('/app/simulator');
}

export async function resetSimulatedConversation(): Promise<void> {
  const ctx = await requireWorkspace();
  await resetSimulator(ctx);
  revalidatePath('/app/simulator');
}

/**
 * Install the restaurant demo so a brand-new workspace has something to run.
 * Idempotent enough for a demo: installing twice just creates a second flow,
 * and the lower-priority one never matches.
 */
export async function installRestaurantDemo(): Promise<SimulatorActionState> {
  const ctx = await requireWorkspace();

  try {
    await installFlowTemplate(ctx, {
      name: 'Restaurant ordering',
      description:
        'Welcome menu, in-chat ordering, table booking, and handoff to staff.',
      vertical: 'restaurant',
      trigger: { type: 'message_received', match: 'any', keywords: [] },
      graph: restaurantOrderGraph(ctx.workspace.name),
      entryNodeId: RESTAURANT_ORDER_ENTRY,
      publish: true,
    });
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Could not install the demo flow.',
      notice: null,
    };
  }

  revalidatePath('/app/simulator');
  revalidatePath('/app/flows');
  return { error: null, notice: 'Restaurant demo installed and published.' };
}
