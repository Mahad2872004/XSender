import type { Channel, Json } from '@/lib/database.types';
import { encryptSecret } from '@/server/crypto/secrets';
import { graphCall } from '@/server/meta/graph';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Connecting a WhatsApp number to a workspace.
 *
 * Manual for now, on purpose: Embedded Signup is deferred until manual
 * onboarding has proven the flow works with real pilot clients. The team pastes
 * credentials from the Meta dashboard and this encrypts and verifies them.
 *
 * WhatsApp only. Instagram and Messenger are architecturally supported but
 * deliberately not offered — connecting three channels at once only delays the
 * first real conversation.
 */

export interface ConnectWhatsAppInput {
  displayName: string;
  /** Cloud API sending identity, from the Meta dashboard. */
  phoneNumberId: string;
  /** WhatsApp Business Account id. Optional — useful for support, not sending. */
  wabaId?: string | null;
  /** System user or permanent token. Encrypted before it touches the database. */
  accessToken: string;
}

export interface WhatsAppNumberInfo {
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
}

/**
 * Ask Meta whether these credentials actually work.
 *
 * Run before saving: a token that is wrong, expired, or scoped to a different
 * number should be rejected while someone is looking at the form, not silently
 * at 2am when a customer messages.
 */
export async function verifyWhatsAppCredentials(
  input: Pick<ConnectWhatsAppInput, 'phoneNumberId' | 'accessToken'>
): Promise<WhatsAppNumberInfo> {
  const result = await graphCall<{
    display_phone_number?: string;
    verified_name?: string;
    quality_rating?: string;
  }>({
    path: `${input.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    token: input.accessToken,
    method: 'GET',
  });

  return {
    displayPhoneNumber: result.display_phone_number ?? null,
    verifiedName: result.verified_name ?? null,
    qualityRating: result.quality_rating ?? null,
  };
}

/**
 * Save a verified number against the workspace.
 *
 * `phone_number_id` is globally unique, which is what lets an inbound webhook
 * resolve to exactly one tenant. Reconnecting the same number updates the
 * existing row rather than creating a second one that would break that lookup.
 */
export async function connectWhatsApp(
  ctx: WorkspaceContext,
  input: ConnectWhatsAppInput,
  info: WhatsAppNumberInfo
): Promise<Channel> {
  ctx.requireRole('admin');

  const row = {
    type: 'whatsapp' as const,
    status: 'connected' as const,
    display_name: input.displayName.trim() || info.verifiedName || 'WhatsApp',
    phone_number_id: input.phoneNumberId.trim(),
    phone_number: info.displayPhoneNumber,
    waba_id: input.wabaId?.trim() || null,
    access_token_ciphertext: encryptSecret(input.accessToken),
    last_error: null,
    last_error_at: null,
    connected_at: new Date().toISOString(),
  };

  const { data: existing } = await ctx
    .table('channels')
    .select()
    .eq('phone_number_id', row.phone_number_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await ctx
      .table('channels')
      .update(row)
      .eq('id', existing.id)
      .select()
      .single();

    if (error || !data) throw new Error(`Could not update the channel: ${error?.message}`);
    await recordEvent(ctx, data.id, 'channel.reconnected');
    return data;
  }

  const { data, error } = await ctx.table('channels').insert(row).select().single();
  if (error) {
    // 23505 on the global unique index: the number belongs to another workspace.
    if (error.code === '23505') {
      throw new Error(
        'That phone number is already connected to a different workspace. Disconnect it there first.'
      );
    }
    throw new Error(`Could not connect the channel: ${error.message}`);
  }
  if (!data) throw new Error('Could not connect the channel.');

  await recordEvent(ctx, data.id, 'channel.connected');
  return data;
}

/**
 * Disconnect a channel.
 *
 * The token is cleared and the phone number id released so the number can be
 * connected elsewhere; conversation history stays, because a business that
 * reconnects next week should not lose its record of what happened.
 */
export async function disconnectChannel(ctx: WorkspaceContext, channelId: string): Promise<void> {
  ctx.requireRole('admin');

  const { error } = await ctx
    .table('channels')
    .update({
      status: 'disconnected',
      access_token_ciphertext: null,
      phone_number_id: null,
      connected_at: null,
    })
    .eq('id', channelId);

  if (error) throw new Error(`Could not disconnect: ${error.message}`);
  await recordEvent(ctx, channelId, 'channel.disconnected');
}

/** Record a failure against a channel so the UI can prompt for a reconnect. */
export async function markChannelError(
  ctx: WorkspaceContext,
  channelId: string,
  message: string
): Promise<void> {
  await ctx
    .table('channels')
    .update({
      status: 'error',
      last_error: message.slice(0, 500),
      last_error_at: new Date().toISOString(),
    })
    .eq('id', channelId);
}

/** Real channels only — the simulator is an internal testing surface. */
export async function listConnectableChannels(ctx: WorkspaceContext): Promise<Channel[]> {
  const { data } = await ctx
    .table('channels')
    .select()
    .neq('type', 'simulator')
    .order('created_at', { ascending: true });

  return data ?? [];
}

async function recordEvent(ctx: WorkspaceContext, channelId: string, type: string): Promise<void> {
  await ctx.table('events').insert({
    type,
    entity_type: 'channel',
    entity_id: channelId,
    actor_user_id: ctx.userId === 'system' ? null : ctx.userId,
    payload: {} as Json,
  });
}
