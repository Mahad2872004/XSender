import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/env';

/**
 * Encryption for secrets held at rest — currently the Meta access tokens on
 * `channels.access_token_ciphertext`.
 *
 * A leaked WhatsApp token lets someone send as the business, so these never sit
 * in plaintext. AES-256-GCM rather than CBC because GCM authenticates as well as
 * encrypts: a tampered ciphertext fails to decrypt instead of quietly producing
 * garbage that the Graph API would then reject in some confusing way.
 *
 * Stored as `v1:<iv>:<tag>:<ciphertext>`, all base64url. The version prefix is
 * there so a future key rotation can decrypt old values while writing new ones.
 */

const VERSION = 'v1';
const IV_BYTES = 12; // 96 bits, the size GCM is specified for
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = Buffer.from(serverEnv().ENCRYPTION_KEY, 'base64');
  if (raw.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_BYTES} bytes base64-encoded, got ${raw.length}. ` +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }

  cachedKey = raw;
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  const [version, ivPart, tagPart, dataPart] = parts;

  // Validate the shape, not the truthiness of each part: an empty plaintext
  // encrypts to empty ciphertext, which is structurally valid.
  if (parts.length !== 4 || version !== VERSION || !ivPart || !tagPart) {
    throw new Error('Stored secret is not in the expected format.');
  }

  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  // Throws if the ciphertext or tag was altered, which is the point.
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Constant-time string comparison, for webhook signatures and shared secrets.
 *
 * `a === b` leaks how many characters matched through how long it took, which
 * is enough to reconstruct a signature one byte at a time.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');

  // timingSafeEqual throws on length mismatch, so compare lengths first — the
  // length of a signature is not a secret.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
