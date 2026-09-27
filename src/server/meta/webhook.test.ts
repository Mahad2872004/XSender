import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySignature, verifySubscription } from './webhook';

// Matches vitest.setup.ts.
const APP_SECRET = 'test-app-secret';
const VERIFY_TOKEN = 'test-verify-token';

function sign(body: string, secret = APP_SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('verifySignature', () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  it('accepts a correctly signed body', () => {
    expect(verifySignature(body, sign(body))).toBe(true);
  });

  it('rejects a body signed with the wrong secret', () => {
    expect(verifySignature(body, sign(body, 'not-the-secret'))).toBe(false);
  });

  it('rejects a tampered body', () => {
    const signature = sign(body);
    const tampered = JSON.stringify({ object: 'whatsapp_business_account', entry: [{}] });
    expect(verifySignature(tampered, signature)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifySignature(body, null)).toBe(false);
  });

  it('rejects a malformed header without throwing', () => {
    for (const header of ['', 'sha256=', 'garbage', 'sha1=abc']) {
      expect(verifySignature(body, header)).toBe(false);
    }
  });

  it('is sensitive to byte-level differences, not just parsed equality', () => {
    // The reason the raw body must be used: these parse identically but hash
    // differently, so re-serialising before verifying would break signatures.
    const a = '{"a":1,"b":2}';
    const b = '{"b":2,"a":1}';
    expect(verifySignature(a, sign(a))).toBe(true);
    expect(verifySignature(b, sign(a))).toBe(false);
  });
});

describe('verifySubscription', () => {
  function params(entries: Record<string, string>) {
    return new URLSearchParams(entries);
  }

  it('returns the challenge when the token matches', () => {
    expect(
      verifySubscription(
        params({
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': '1158201444',
        })
      )
    ).toBe('1158201444');
  });

  it('refuses a wrong token', () => {
    expect(
      verifySubscription(
        params({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong',
          'hub.challenge': '123',
        })
      )
    ).toBeNull();
  });

  it('refuses a mode other than subscribe', () => {
    expect(
      verifySubscription(
        params({
          'hub.mode': 'unsubscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': '123',
        })
      )
    ).toBeNull();
  });

  it('refuses a missing challenge', () => {
    expect(
      verifySubscription(params({ 'hub.mode': 'subscribe', 'hub.verify_token': VERIFY_TOKEN }))
    ).toBeNull();
  });
});
