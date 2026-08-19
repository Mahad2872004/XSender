import type { Job } from '@/lib/database.types';
import { supabaseAdmin } from '@/server/db/admin';
import { registerHandler } from '@/server/queue/handlers';
import { enqueue } from '@/server/queue/jobs';

/**
 * Clears out demo conversations that have gone quiet.
 *
 * The public demo creates a contact and a conversation per visitor. Without
 * this the demo workspace grows forever, and a session is worthless the moment
 * someone closes the tab. Deleting the contact cascades to its conversation,
 * messages, orders and flow runs.
 *
 * Reschedules itself, so one enqueue keeps it running.
 */

const INTERVAL_MS = 30 * 60 * 1000;

// The job carries no payload — the reaper always sweeps the same window.
async function handleReap(_job: Job): Promise<void> {
  const { data, error } = await supabaseAdmin().rpc('reap_demo_sessions', {
    older_than: '2 hours',
  });

  if (error) throw new Error(`Could not reap demo sessions: ${error.message}`);
  if ((data ?? 0) > 0) {
    console.log(`[demo] reaped ${data} stale session(s)`);
  }

  await scheduleNextReap();
}

export function scheduleNextReap(at = new Date(Date.now() + INTERVAL_MS)) {
  return enqueue({
    type: 'demo.reap',
    runAt: at,
    // Without this a restart could stack up duplicate reapers.
    dedupeKey: 'demo.reap',
  });
}

registerHandler('demo.reap', handleReap);
