import type { Channel } from '@/lib/database.types';
import type { OutboundPayload } from '@/lib/schemas/message';
import type { ChannelAdapter, ChannelCapabilities, SendResult } from './types';

/**
 * The built-in test channel.
 *
 * Delivery is a no-op: the message row is already written by the outbound
 * pipeline, and the Simulator UI reads it over Supabase Realtime. Nothing
 * leaves the server.
 *
 * Its capabilities deliberately mirror WhatsApp's — buttons capped at 3, lists
 * supported — so a flow that looks right here looks right on the real channel.
 * The one difference is `serviceWindow: false`, since there is no 24-hour limit
 * to enforce against a fake customer.
 */
export class SimulatorAdapter implements ChannelAdapter {
  readonly type = 'simulator' as const;

  readonly capabilities: ChannelCapabilities = {
    buttons: true,
    maxButtons: 3,
    lists: true,
    media: true,
    location: true,
    templates: true,
    serviceWindow: false,
  };

  async send(
    _channel: Channel,
    _recipientExternalId: string,
    _payload: OutboundPayload
  ): Promise<SendResult> {
    return { externalId: null };
  }
}

export const simulatorAdapter = new SimulatorAdapter();
