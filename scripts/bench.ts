/**
 * Timing harness for the paths a user actually waits on.
 *
 *   npx tsx --env-file=.env scripts/bench.ts
 *
 * Every Supabase round trip costs ~265ms from Pakistan to the Mumbai region,
 * so what matters is the number of sequential trips, not query complexity.
 * Run this after touching anything on the inbound or page-load path.
 */

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/server/db/admin';
import { workspaceContext } from '@/server/db/tenancy';
import { installFlowTemplate } from '@/server/flow/publish';
import {
  restaurantOrderGraph,
  RESTAURANT_ORDER_ENTRY,
} from '@/server/flow/templates/restaurant-order';
import { loadSimulatorState, sendAsCustomer } from '@/server/simulator/service';
import type { Workspace } from '@/lib/database.types';

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  console.log(`  ${ms.toFixed(0).padStart(6)}ms  ${label}`);
  return result;
}

async function main() {
  const email = `bench-${Date.now()}@xsender.test`;

  const { data: created, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password: `Bench-${randomUUID().slice(0, 12)}!`,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(error?.message ?? 'could not create user');

  const { data: ws } = await supabaseAdmin().rpc('create_workspace', {
    p_user_id: created.user.id,
    p_name: 'Bench Cafe',
    p_vertical: 'restaurant',
  });
  const workspace = ws as Workspace;
  const ctx = await workspaceContext(created.user.id, workspace.id);

  await installFlowTemplate(ctx, {
    name: 'Restaurant ordering',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    graph: restaurantOrderGraph('Bench Cafe'),
    entryNodeId: RESTAURANT_ORDER_ENTRY,
    publish: true,
  });

  console.log('\nInbound message → bot reply (what the customer waits for):');
  await time('first message ("hi"), starts the flow', () =>
    sendAsCustomer(ctx, { type: 'text', text: 'hi' })
  );
  await time('tap "View Menu"', () =>
    sendAsCustomer(ctx, { type: 'reply', replyId: 'order', title: 'View Menu' })
  );
  await time('tap "Mains"', () =>
    sendAsCustomer(ctx, { type: 'reply', replyId: 'mains', title: 'Mains' })
  );
  await time('tap "Beef Biryani" (2 nodes + message)', () =>
    sendAsCustomer(ctx, { type: 'reply', replyId: 'beef_biryani', title: 'Beef Biryani' })
  );

  console.log('\nSimulator page data:');
  await time('loadSimulatorState', () => loadSimulatorState(ctx));
  await time('loadSimulatorState (warm)', () => loadSimulatorState(ctx));

  // Cleanup
  await supabaseAdmin().from('workspaces').delete().eq('id', workspace.id);
  await supabaseAdmin().auth.admin.deleteUser(created.user.id);
  console.log('\n(bench workspace removed)\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
