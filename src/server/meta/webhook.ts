import { createHmac } from 'node:crypto';
import { metaEnv } from '@/lib/env';
import type { Channel, Json, MessageStatus } from '@/lib/database.types';
import { safeEqual } from '@/server/crypto/secrets';
import { supabaseAdmin } from '@/server/db/admin';
import { systemContext } from '@/server/db/tenancy';
import { receiveInboundMessage } from '@/server/messaging/inbound';
import type { InboundStatus } from '@/server/channels/types';
import { normalizeWhatsAppWebhook, phoneNumberIdFromWebhook } from '@/server/channels/whatsapp';

/**
 * Meta webhook handling.
 *
 * Split out of the route so the signature check and the processing can be
 * tested without spinning up Next. The route stays thin: verify, persist,
 * return 200, then hand off to `processWebhook` inside `after()`.
 */

/**
 * Verify `X-Hub-Signature-256` against the raw request body.
 *
 * Must be the *raw* bytes — re-serialising the parsed JSON changes key order
 * and whitespace, and the HMAC no longer matches. This is the single most
 * common way webhook verification is got wrong.
 */
export function verifySignature(rawBody: string, header: string | null): boolean {
  if (!header) return false;

  const expected =
    'sha256=' +
    createHmac('sha256', metaEnv().META_APP_SECRET).update(rawBody, 'utf8').digest('hex');

  return safeEqual(header, expected);
}

/** Meta's subscription handshake: echo back the challenge if the token matches. */
export function verifySubscription(params: URLSearchParams): string | null {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) return null;
  if (!safeEqual(token, metaEnv().META_WEBHOOK_VERIFY_TOKEN)) return null;

  return challenge;
}

/** Record every delivery, verified or not — this is the audit and replay trail. */
export async function recordDelivery(options: {
  body: unknown;
  signatureOk: boolean;
  headers: Record<string, string>;
}): Promise<number | null> {
  const { data } = await supabaseAdmin()
    .from('webhook_deliveries')
    .insert({
      source: 'meta',
      signature_ok: options.signatureOk,
      headers: options.headers as Json,
      body: options.body as Json,
    })
    .select('id')
    .maybeSingle();

  return (data as { id: number } | null)?.id ?? null;
}

async function markProcessed(deliveryId: number | null, error?: string): Promise<void> {
  if (deliveryId === null) return;
  await supabaseAdmin()
    .from('webhook_deliveries')
    .update({ processed_at: new Date().toISOString(), error: error ?? null })
    .eq('id', deliveryId);
}

/**
 * Resolve which workspace a webhook belongs to.
 *
 * `channels.phone_number_id` is globally unique (a partial unique index), so
 * one lookup identifies the tenant. Everything after this point goes through
 * the normal tenancy guard.
 */
async function channelForPhoneNumberId(phoneNumberId: string): Promise<Channel | null> {
  const { data } = await supabaseAdmin()
    .from('channels')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();

  return (data as Channel | null) ?? null;
}

export interface WebhookOutcome {
  messagesProcessed: number;
  statusesProcessed: number;
  skipped: string | null;
}

/**
 * Process a verified webhook body.
 *
 * Runs after the 200 has gone back to Meta. Everything in here must be safe to
 * run twice: Meta retries a delivery it did not get a prompt 200 for, and the
 * same message can arrive more than once.
 */
export async function processWebhook(
  body: unknown,
  deliveryId: number | null = null
): Promise<WebhookOutcome> {
  const outcome: WebhookOutcome = { messagesProcessed: 0, statusesProcessed: 0, skipped: null };

  try {
    const phoneNumberId = phoneNumberIdFromWebhook(body);
    if (!phoneNumberId) {
      outcome.skipped = 'no phone_number_id in payload';
      await markProcessed(deliveryId, outcome.skipped);
      return outcome;
    }

    const channel = await channelForPhoneNumberId(phoneNumberId);
    if (!channel) {
      // Meta can deliver for a number that was disconnected, or one belonging
      // to a different environment sharing the app. Not an error.
      outcome.skipped = `no channel connected for phone_number_id ${phoneNumberId}`;
      await markProcessed(deliveryId, outcome.skipped);
      return outcome;
    }

    const ctx = await systemContext(channel.workspace_id);
    const { messages, statuses } = normalizeWhatsAppWebhook(body);

    // Sequential on purpose: two messages from the same customer must not race
    // each other into the flow engine, which would run one against stale state.
    for (const message of messages) {
      await receiveInboundMessage(ctx, channel, message);
      outcome.messagesProcessed += 1;
    }

    for (const status of statuses) {
      await applyStatus(ctx, status);
      outcome.statusesProcessed += 1;
    }

    await markProcessed(deliveryId);
    return outcome;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    await markProcessed(deliveryId, message);
    throw cause;
  }
}

/** Delivery receipts, matched back to the message row by Meta's own id. */
async function applyStatus(
  ctx: Awaited<ReturnType<typeof systemContext>>,
  status: InboundStatus
): Promise<void> {
  const timestamp = status.timestamp.toISOString();

  const patch: Record<string, unknown> = { status: status.status as MessageStatus };
  if (status.status === 'delivered') patch.delivered_at = timestamp;
  if (status.status === 'read') patch.read_at = timestamp;
  if (status.status === 'sent') patch.sent_at = timestamp;
  if (status.status === 'failed') patch.error = status.error ?? 'Delivery failed';

  await ctx.table('messages').update(patch).eq('external_id', status.externalId);
}
