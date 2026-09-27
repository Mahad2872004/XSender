import { hasMetaConfig } from '@/lib/env';
import { requireOnboarded } from '@/server/auth/session';
import { listConnectableChannels } from '@/server/channels/connect';
import ChannelsClient from './ChannelsClient';

export const metadata = { title: 'Channels · xSender' };

/**
 * Where a real WhatsApp number gets attached to a workspace.
 *
 * Manual paste-the-credentials for now. Embedded Signup is a Tech Provider
 * feature worth building once manual onboarding has proven the flow with real
 * pilot clients — not before.
 */
export default async function ChannelsPage() {
  const ctx = await requireOnboarded();
  const channels = await listConnectableChannels(ctx);

  return (
    <ChannelsClient
      channels={channels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        status: channel.status,
        displayName: channel.display_name,
        phoneNumber: channel.phone_number,
        phoneNumberId: channel.phone_number_id,
        wabaId: channel.waba_id,
        lastError: channel.last_error,
        connectedAt: channel.connected_at,
      }))}
      canManage={ctx.hasRole('admin')}
      metaConfigured={hasMetaConfig()}
    />
  );
}
