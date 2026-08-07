import type { ChannelType } from '@/lib/database.types';
import type { ChannelAdapter } from './types';
import { simulatorAdapter } from './simulator';

/**
 * Channel type → adapter.
 *
 * WhatsApp, Instagram, and Messenger register here in Phase 4. Until then the
 * simulator is the only one, and everything upstream of this map already works
 * the way it will once the real channels land.
 */
const adapters = new Map<ChannelType, ChannelAdapter>([['simulator', simulatorAdapter]]);

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
