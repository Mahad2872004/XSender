import { after, NextResponse, type NextRequest } from 'next/server';
import { hasMetaConfig } from '@/lib/env';
import {
  processWebhook,
  recordDelivery,
  verifySignature,
  verifySubscription,
} from '@/server/meta/webhook';

/**
 * Meta's webhook endpoint for WhatsApp.
 *
 * Two rules drive the shape of this file:
 *
 *  1. Return 200 fast. Meta retries anything it does not get a prompt response
 *     for, and repeated retries on a slow endpoint get the subscription
 *     disabled. So the work happens in `after()`, once the response is out.
 *  2. Verify the signature against the *raw* body. Re-serialising the parsed
 *     JSON changes byte order and the HMAC stops matching.
 *
 * Excluded from the proxy matcher in src/proxy.ts — it authenticates by
 * signature, not by session.
 */

/** GET — Meta's subscription handshake. */
export async function GET(request: NextRequest) {
  if (!hasMetaConfig()) {
    return new NextResponse('Meta is not configured on this deployment.', { status: 503 });
  }

  const challenge = verifySubscription(request.nextUrl.searchParams);

  if (!challenge) {
    // Deliberately vague: a wrong verify token should not tell the caller
    // which part they got wrong.
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Meta expects the bare challenge string, not JSON.
  return new NextResponse(challenge, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  });
}

/** POST — inbound messages and delivery receipts. */
export async function POST(request: NextRequest) {
  if (!hasMetaConfig()) {
    return new NextResponse('Meta is not configured on this deployment.', { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const signatureOk = verifySignature(rawBody, signature);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Expected JSON.', { status: 400 });
  }

  // Persisted before anything else, valid or not: an unverified delivery is
  // exactly what you want a record of, and a verified one can be replayed.
  const deliveryId = await recordDelivery({
    body,
    signatureOk,
    headers: {
      'x-hub-signature-256': signature ?? '',
      'user-agent': request.headers.get('user-agent') ?? '',
    },
  });

  if (!signatureOk) {
    console.warn('[meta-webhook] rejected a delivery with an invalid signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Respond now; process after. An exception in here must not become an error
  // response, or Meta will retry a message that was already handled.
  after(async () => {
    try {
      const outcome = await processWebhook(body, deliveryId);
      if (outcome.skipped) {
        console.info(`[meta-webhook] skipped — ${outcome.skipped}`);
      } else {
        console.info(
          `[meta-webhook] ${outcome.messagesProcessed} message(s), ${outcome.statusesProcessed} status update(s)`
        );
      }
    } catch (cause) {
      console.error('[meta-webhook] processing failed', cause);
    }
  });

  return NextResponse.json({ received: true });
}
