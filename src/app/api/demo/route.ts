import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { MessagePayloadSchema } from '@/lib/schemas/message';
import {
  createSession,
  DemoLimitError,
  hashIp,
  loadSession,
  loadTranscript,
  sendDemoMessage,
} from '@/server/demo/service';

/**
 * The public demo endpoint.
 *
 * Unauthenticated by design — the whole point is that a stranger can use it —
 * so every path through here is bounded by the limits in the demo service.
 * Session identity lives in an httpOnly cookie rather than the request body,
 * so a caller cannot claim someone else's conversation.
 */

const COOKIE = 'xs_demo';
const COOKIE_MAX_AGE = 60 * 60 * 2; // matches the session reaper's window

const bodySchema = z.object({
  action: z.enum(['start', 'send']),
  payload: MessagePayloadSchema.optional(),
});

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const ip = clientIp(request);
  const ipHash = ip ? hashIp(ip) : null;
  const token = request.cookies.get(COOKIE)?.value;

  try {
    // Reuse the browser's session where it still exists; the reaper may have
    // cleared it, in which case start fresh rather than erroring at a visitor.
    let session = token ? await loadSession(token) : null;
    let issuedToken: string | null = null;

    if (!session) {
      session = await createSession(ipHash);
      issuedToken = session.token;
    }

    if (parsed.data.action === 'send') {
      if (!parsed.data.payload) {
        return NextResponse.json({ error: 'Nothing to send.' }, { status: 400 });
      }
      await sendDemoMessage(session, parsed.data.payload);
    }

    const transcript = await loadTranscript(session);
    const response = NextResponse.json(transcript);

    if (issuedToken) {
      response.cookies.set(COOKIE, issuedToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
    }

    return response;
  } catch (cause) {
    if (cause instanceof DemoLimitError) {
      return NextResponse.json({ error: cause.message }, { status: 429 });
    }

    console.error('[demo]', cause);
    return NextResponse.json(
      { error: 'The demo is having a moment. Try again shortly.' },
      { status: 500 }
    );
  }
}

/** Clear the session so the visitor can start the conversation again. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE);
  return response;
}
