'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hasMetaConfig } from '@/lib/env';
import { APP } from '@/lib/routes';
import { requireWorkspace } from '@/server/auth/session';
import {
  connectWhatsApp,
  disconnectChannel,
  markChannelError,
  verifyWhatsAppCredentials,
} from '@/server/channels/connect';
import { ChannelSendError } from '@/server/channels/types';
import { channelToken } from '@/server/meta/graph';
import type { ConnectState } from './form-state';

/**
 * Connecting a WhatsApp number.
 *
 * Verified against the Graph API before anything is written: a token that does
 * not work should be rejected while someone is looking at the form, not silently
 * at 2am when a customer messages. The token is never echoed back into the
 * response, even on failure.
 */

const connectInput = z.object({
  displayName: z.string().trim().max(80),
  phoneNumberId: z
    .string()
    .trim()
    .min(5, 'Paste the Phone number ID from the Meta dashboard.')
    .regex(/^\d+$/, 'A phone number ID is all digits — you may have pasted the number itself.'),
  wabaId: z.string().trim().max(64),
  accessToken: z.string().trim().min(20, 'That access token looks too short to be real.'),
});

export async function connectWhatsAppAction(
  _prev: ConnectState,
  formData: FormData
): Promise<ConnectState> {
  const values = {
    displayName: String(formData.get('displayName') ?? ''),
    phoneNumberId: String(formData.get('phoneNumberId') ?? ''),
    wabaId: String(formData.get('wabaId') ?? ''),
  };

  const parsed = connectInput.safeParse({
    ...values,
    accessToken: String(formData.get('accessToken') ?? ''),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Check the details and try again.',
      connected: null,
      values,
    };
  }

  if (!hasMetaConfig()) {
    return {
      error:
        'Meta credentials are not configured on this server yet. Set META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN in the environment first.',
      connected: null,
      values,
    };
  }

  const ctx = await requireWorkspace();
  ctx.requireRole('admin');

  try {
    const info = await verifyWhatsAppCredentials({
      phoneNumberId: parsed.data.phoneNumberId,
      accessToken: parsed.data.accessToken,
    });

    await connectWhatsApp(ctx, parsed.data, info);
  } catch (cause) {
    // ChannelSendError already carries a message written for a business owner
    // rather than a Graph API code.
    return {
      error:
        cause instanceof ChannelSendError
          ? `Meta rejected these credentials. ${cause.message}`
          : cause instanceof Error
            ? cause.message
            : 'Could not connect that number.',
      connected: null,
      values,
    };
  }

  revalidatePath(APP.channels);
  revalidatePath(APP.dashboard);
  return { error: null, connected: null, values };
}

export async function disconnectChannelAction(channelId: string): Promise<void> {
  const ctx = await requireWorkspace();
  ctx.requireRole('admin');
  await disconnectChannel(ctx, channelId);
  revalidatePath(APP.channels);
  revalidatePath(APP.dashboard);
}

/**
 * Re-check a connected number's token.
 *
 * Tokens expire and permissions get revoked. Better for the team to find out by
 * pressing a button than by a customer's message going unanswered.
 */
export async function recheckChannelAction(channelId: string): Promise<void> {
  const ctx = await requireWorkspace();
  ctx.requireRole('admin');

  const { data: channel } = await ctx.table('channels').select().eq('id', channelId).maybeSingle();
  if (!channel?.phone_number_id || !channel.access_token_ciphertext) return;

  try {
    const info = await verifyWhatsAppCredentials({
      phoneNumberId: channel.phone_number_id,
      accessToken: channelToken(channel),
    });

    await ctx
      .table('channels')
      .update({
        status: 'connected',
        phone_number: info.displayPhoneNumber,
        last_error: null,
        last_error_at: null,
      })
      .eq('id', channelId);
  } catch (cause) {
    await markChannelError(
      ctx,
      channelId,
      cause instanceof Error ? cause.message : 'Token check failed.'
    );
  }

  revalidatePath(APP.channels);
}
