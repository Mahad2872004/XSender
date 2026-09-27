import type { ChannelType } from '@/lib/database.types';
import type { ChannelAdapter } from './types';
import { simulatorAdapter } from './simulator';
import { whatsappAdapter } from './whatsapp';

/**
 * Channel type → adapter.
 *
 * Instagram and Messenger are deliberately absent. The interface supports them
 * and the work is mostly wiring, but they stay unregistered until WhatsApp has
 * real, retained pilot clients — connecting three channels at once only delays
 * the first real conversation.
 */
const adapters = new Map<ChannelType, ChannelAdapter>([
  ['simulator', simulatorAdapter],
  ['whatsapp', whatsappAdapter],
]);

export function registerAdapter(adapter: ChannelAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function adapterFor(type: ChannelType): ChannelAdapter {
  const adapter = adapters.get(type);
  if (!adapter) {
    throw new Error(
      `No adapter registered for channel type "${type}". Connect it in Settings, or check the Phase 4 channel wiring.`
    );
  }
  return adapter;
}

export function isChannelSupported(type: ChannelType): boolean {
  return adapters.has(type);
}
