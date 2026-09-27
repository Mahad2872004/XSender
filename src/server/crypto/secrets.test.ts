import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, safeEqual } from './secrets';

// ENCRYPTION_KEY comes from vitest.setup.ts, which runs before any import.

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a token', () => {
    const token = 'EAAG...a-realistic-looking-meta-access-token';
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it('produces different ciphertext each time', () => {
    // A fresh IV per call, so two channels sharing a token do not reveal it by
    // having identical rows.
    const a = encryptSecret('same-token');
    const b = encryptSecret('same-token');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it('handles unicode and empty strings', () => {
    for (const value of ['', 'ᏔᎾᏯ', '🔐 token', 'a'.repeat(5000)]) {
      expect(decryptSecret(encryptSecret(value))).toBe(value);
    }
  });

  it('carries a version prefix so keys can be rotated later', () => {
    expect(encryptSecret('x').startsWith('v1:')).toBe(true);
  });

  it('refuses a tampered ciphertext rather than returning garbage', () => {
    const stored = encryptSecret('secret-token');
    const [version, iv, tag, data] = stored.split(':');

    // Flip a character in the ciphertext.
    const flipped = data[0] === 'A' ? `B${data.slice(1)}` : `A${data.slice(1)}`;
    expect(() => decryptSecret([version, iv, tag, flipped].join(':'))).toThrow();
  });

  it('refuses a tampered auth tag', () => {
    const stored = encryptSecret('secret-token');
    const [version, iv, tag, data] = stored.split(':');
    const flipped = tag[0] === 'A' ? `B${tag.slice(1)}` : `A${tag.slice(1)}`;
    expect(() => decryptSecret([version, iv, flipped, data].join(':'))).toThrow();
  });

  it('rejects a malformed value', () => {
    for (const bad of ['', 'not-encrypted', 'v1:only:three', 'v2:a:b:c']) {
      expect(() => decryptSecret(bad)).toThrow();
    }
  });
});

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('sha256=abc123', 'sha256=abc123')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(safeEqual('sha256=abc123', 'sha256=abc124')).toBe(false);
  });

  it('rejects different lengths without throwing', () => {
    // timingSafeEqual itself throws on a length mismatch; this must not.
    expect(safeEqual('short', 'considerably-longer')).toBe(false);
  });

  it('handles empty strings', () => {
    expect(safeEqual('', '')).toBe(true);
    expect(safeEqual('', 'x')).toBe(false);
  });
});
