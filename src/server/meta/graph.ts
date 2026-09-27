import { metaEnv } from '@/lib/env';
import type { Channel } from '@/lib/database.types';
import { decryptSecret } from '@/server/crypto/secrets';
import { ChannelSendError } from '@/server/channels/types';

/**
 * Meta Graph API client.
 *
 * Thin on purpose — its real job is turning Graph's error shape into a decision
 * the job queue can act on. Retrying a permanent failure (revoked token, a
 * customer who blocked the business, a closed 24-hour window) burns quota and
 * never succeeds, so `retryable` has to be honest rather than optimistic.
 */

const GRAPH_HOST = 'https://graph.facebook.com';

/** Meta error codes that will never succeed on a retry. */
const PERMANENT_CODES = new Set([
  100, // invalid parameter
  190, // access token expired or revoked
  200, // permission denied
  131_009, // parameter value not valid
  131_026, // message undeliverable — recipient cannot receive it
  131_047, // re-engagement required: the 24-hour window has closed
  131_051, // unsupported message type
  131_053, // media upload error
  132_000, // template param count mismatch
  132_001, // template does not exist
  133_010, // phone number not registered
]);

/** Codes that mean "slow down" — worth retrying after the queue's backoff. */
const THROTTLE_CODES = new Set([4, 80_007, 130_429, 131_048]);

export interface GraphError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_data?: { details?: string };
  fbtrace_id?: string;
}

/** The access token for a channel, decrypted. */
export function channelToken(channel: Channel): string {
  if (!channel.access_token_ciphertext) {
    throw new ChannelSendError(
      `Channel "${channel.display_name}" has no access token. Reconnect it in Settings.`,
      false
    );
  }
  return decryptSecret(channel.access_token_ciphertext);
}

export interface GraphCallOptions {
  /** Graph node and edge, e.g. `123456/messages`. */
  path: string;
  token: string;
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** Guards against a hung request holding a worker slot open. */
  timeoutMs?: number;
}

export async function graphCall<T = unknown>(options: GraphCallOptions): Promise<T> {
  const { META_GRAPH_VERSION } = metaEnv();
  const url = `${GRAPH_HOST}/${META_GRAPH_VERSION}/${options.path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'POST',
      headers: {
        authorization: `Bearer ${options.token}`,
        'content-type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (cause) {
    // Network failure or timeout — transient by nature, so worth another go.
    throw new ChannelSendError(
      cause instanceof Error && cause.name === 'AbortError'
        ? 'Meta did not respond in time.'
        : `Could not reach Meta: ${cause instanceof Error ? cause.message : String(cause)}`,
      true,
      cause
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new ChannelSendError(
      `Meta returned a non-JSON response (${response.status}).`,
      response.status >= 500
    );
  }

  if (!response.ok) {
    const error = (parsed as { error?: GraphError }).error ?? { message: text };
    throw new ChannelSendError(describeGraphError(error), isRetryable(response.status, error), error);
  }

  return parsed as T;
}

function isRetryable(status: number, error: GraphError): boolean {
  if (error.code !== undefined && PERMANENT_CODES.has(error.code)) return false;
  if (error.code !== undefined && THROTTLE_CODES.has(error.code)) return true;

  // 5xx is Meta's problem and usually passes; 429 is throttling. Everything
  // else in the 4xx range is our request being wrong, which a retry cannot fix.
  if (status >= 500) return true;
  if (status === 429) return true;
  return false;
}

/**
 * A message a business owner can act on, not a raw API dump.
 *
 * The 24-hour window case gets spelled out because it is the single most common
 * WhatsApp failure and the least self-explanatory error Meta returns.
 */
function describeGraphError(error: GraphError): string {
  const detail = error.error_data?.details;

  switch (error.code) {
    case 190:
      return 'The WhatsApp access token has expired or been revoked. Reconnect the channel.';
    case 131_047:
      // Parenthesised deliberately: a bare `return` followed by a newline is
      // turned into `return;` by automatic semicolon insertion, which would
      // silently blank the most common WhatsApp error of all.
      return (
        'Outside the 24-hour messaging window — only an approved template can be sent ' +
        'until the customer writes again.'
      );
    case 131_026:
      return 'WhatsApp could not deliver this message to that number.';
    case 133_010:
      return 'That phone number is not registered on the WhatsApp Business API.';
    case 132_001:
      return `That message template does not exist or is not approved${detail ? `: ${detail}` : ''}.`;
    default:
      return detail ? `${error.message} (${detail})` : error.message;
  }
}
