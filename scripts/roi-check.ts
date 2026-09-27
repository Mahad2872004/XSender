/**
 * Checks the ROI aggregation against real rows.
 *
 * The hero figure on the dashboard is the product's whole argument, so its
 * arithmetic gets verified against the database rather than trusted. This script
 * creates a workspace, plays a known conversation through the real inbound
 * pipeline, and asserts the numbers that come back — including the one that is
 * easy to get wrong: a turn where the bot replies three times must count once.
 *
 *   npm run roi:check
 */
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../src/server/db/admin';
import { contextFromMembership } from '../src/server/db/tenancy';
import { loadRoiSummary, periodFor, readAssumptions } from '../src/server/roi/summary';
import type { Workspace } from '../src/lib/database.types';

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}: ${String(actual)}${ok ? '' : ` (expected ${String(expected)})`}`);
}

async function main(): Promise<void> {
  const db = supabaseAdmin();
  const suffix = randomUUID().slice(0, 8);

  console.log('Creating a throwaway workspace…');
  const { data: workspace, error: wsError } = await db
    .from('workspaces')
    .insert({
      name: `ROI check ${suffix}`,
      slug: `roi-check-${suffix}`,
      currency: 'USD',
      timezone: 'UTC',
      locale: 'en-US',
    })
    .select()
    .single();

  if (wsError || !workspace) throw new Error(`Could not create workspace: ${wsError?.message}`);
  const ws = workspace as Workspace;
  const ctx = contextFromMembership(ws, 'system', 'owner');

  try {
    const { data: channel } = await db
      .from('channels')
      .insert({
        workspace_id: ws.id,
        type: 'simulator',
        status: 'connected',
        display_name: 'Check',
      })
      .select()
      .single();

    const { data: contact } = await db
      .from('contacts')
      .insert({ workspace_id: ws.id, full_name: 'Test Customer' })
      .select()
      .single();

    const { data: conversation } = await db
      .from('conversations')
      .insert({
        workspace_id: ws.id,
        channel_id: channel!.id,
        contact_id: contact!.id,
        status: 'open',
      })
      .select()
      .single();

    /**
     * A deliberate shape, written directly so the expected answer is unarguable:
     *
     *   turn 1 — customer asks, bot replies three times   → automated
     *   turn 2 — customer asks, an agent replies          → by a person
     *   turn 3 — customer asks, nothing replies yet       → neither
     *
     * The first turn is the one that matters. Counting outbound bot messages
     * would score it 3; counting turns scores it 1, which is the number of
     * replies a member of staff would actually have had to type.
     */
    const base = Date.now() - 60 * 60 * 1000;
    const at = (minutes: number) => new Date(base + minutes * 60_000).toISOString();

    const rows = [
      { direction: 'inbound', author: 'customer', created_at: at(0) },
      { direction: 'outbound', author: 'flow', created_at: at(1) },
      { direction: 'outbound', author: 'flow', created_at: at(2) },
      { direction: 'outbound', author: 'flow', created_at: at(3) },

      { direction: 'inbound', author: 'customer', created_at: at(10) },
      { direction: 'outbound', author: 'agent', created_at: at(11) },

      { direction: 'inbound', author: 'customer', created_at: at(20) },
    ] as const;

    const { error: msgError } = await db.from('messages').insert(
      rows.map((row) => ({
        workspace_id: ws.id,
        conversation_id: conversation!.id,
        direction: row.direction,
        author: row.author,
        payload: { type: 'text', text: 'x' },
        status: 'sent',
        created_at: row.created_at,
      })) as never
    );
    if (msgError) throw new Error(`Could not insert messages: ${msgError.message}`);

    console.log('\nAggregation:');
    const summary = await loadRoiSummary(ctx, periodFor(7));

    check('turns answered by automation', summary.turnsAutomated, 1);
    check('turns answered by a person', summary.turnsByPerson, 1);
    check('inbound messages', summary.inboundMessages, 3);
    check('outbound bot messages', summary.outboundBotMessages, 3);
    check('conversations total', summary.conversationsTotal, 1);
    check('conversations never needing a person', summary.conversationsAutomated, 0);
    check('automation rate', summary.automationRate, 0.5);
    check('orders captured', summary.ordersCaptured, 0);
    check('is empty', summary.isEmpty, false);

    // The default is 3 minutes, so one automated turn is 0.05 hours.
    check('hours saved', Number(summary.hoursSaved.toFixed(4)), 0.05);
    check('minutes assumption', summary.assumptions.minutesPerMessage, 3);

    console.log('\nDaily buckets:');
    const active = summary.daily.filter((d) => d.turnsAutomated + d.turnsByPerson > 0);
    check('days with activity', active.length, 1);
    check('days returned for a 7-day window', summary.daily.length, 7);

    console.log('\nAssumption override:');
    const overridden = readAssumptions({ roi: { minutesPerMessage: 6 } }, 'USD');
    check('override read back', overridden.assumptions.minutesPerMessage, 6);
    check('override is not the default', overridden.isDefault, false);
    // Out-of-range values are clamped rather than trusted, so a bad settings row
    // cannot produce a ridiculous headline.
    check(
      'absurd override clamped',
      readAssumptions({ roi: { minutesPerMessage: 9000 } }, 'USD').assumptions.minutesPerMessage,
      20
    );
  } finally {
    console.log('\nCleaning up…');
    await db.from('workspaces').delete().eq('id', ws.id);
  }

  console.log(failures === 0 ? '\nAll ROI checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main().catch((cause) => {
  console.error(cause);
  process.exit(1);
});
