/**
 * Drives the public demo the way an anonymous visitor would.
 *
 *   npx tsx --env-file=.env scripts/demo-check.ts
 *
 * Exercises the service directly rather than over HTTP, so it can run without
 * a dev server. Verifies provisioning, the real flow engine responding, that an
 * order actually lands, and that the limits bite.
 */

import { supabaseAdmin } from '@/server/db/admin';
import {
  createSession,
  DEMO_LIMITS,
  DemoLimitError,
  ensureDemoWorkspace,
  loadSession,
  loadTranscript,
  sendDemoMessage,
} from '@/server/demo/service';
import { loadMenu } from '@/server/domain/catalog';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  [32m✓[0m ${label}`);
  } else {
    failed += 1;
    console.log(`  [31m✗[0m ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function lastBotText(transcript: Awaited<ReturnType<typeof loadTranscript>>): string {
  const bot = [...transcript.messages].reverse().find((m) => m.direction === 'outbound');
  if (!bot) return '';
  const payload = bot.payload as { text?: string; title?: string };
  return payload.text ?? payload.title ?? '';
}

function optionsOf(transcript: Awaited<ReturnType<typeof loadTranscript>>) {
  const bot = [...transcript.messages].reverse().find((m) => m.direction === 'outbound');
  const payload = bot?.payload as
    | { type: string; buttons?: Array<{ id: string; title: string }>; sections?: Array<{ rows: Array<{ id: string; title: string }> }> }
    | undefined;

  if (payload?.type === 'buttons') return payload.buttons ?? [];
  if (payload?.type === 'list') return payload.sections?.flatMap((s) => s.rows) ?? [];
  return [];
}

async function main() {
  console.log('\n[1mProvisioning[0m');
  const ctx = await ensureDemoWorkspace();
  check('demo workspace exists', Boolean(ctx.workspaceId));

  const menu = await loadMenu(ctx);
  check('demo menu seeded', menu.length > 0, `${menu.length} categories`);

  const { data: flows } = await ctx.table('flows').select().eq('status', 'published');
  check('an ordering flow is published', (flows ?? []).length > 0);

  // Second call must reuse, not duplicate.
  const again = await ensureDemoWorkspace();
  check('provisioning is idempotent', again.workspaceId === ctx.workspaceId);

  console.log('\n[1mAn anonymous visitor orders[0m');
  const session = await createSession('test-ip-hash');
  check('session created', Boolean(session.token));

  const reloaded = await loadSession(session.token);
  check('session reloads from its token', reloaded?.id === session.id);

  await sendDemoMessage(session, { type: 'text', text: 'Hi' });
  let transcript = await loadTranscript(session);
  check('bot replied to the opener', transcript.messages.length >= 2, lastBotText(transcript).slice(0, 60));

  // Walk the ordering path using whatever the bot actually offers, so this
  // keeps working if the template's wording changes.
  const steps = ['order', 'category', 'item', 'checkout', 'delivery', 'address', 'payment'];
  for (const step of steps) {
    const options = optionsOf(transcript);

    if (options.length === 0) {
      // A free-text question — the address step.
      await sendDemoMessage({ ...session, messageCount: 0 }, {
        type: 'text',
        text: '12 Example Street',
      });
    } else {
      const choice =
        options.find((o) => /menu|order/i.test(o.title) && step === 'order') ??
        options.find((o) => /checkout/i.test(o.title)) ??
        options.find((o) => /delivery/i.test(o.title)) ??
        options.find((o) => /cash/i.test(o.title)) ??
        options[0];

      await sendDemoMessage({ ...session, messageCount: 0 }, {
        type: 'reply',
        replyId: choice.id,
        title: choice.title,
      });
    }

    transcript = await loadTranscript(session);
    if (transcript.orderPlaced) break;
  }

  check('an order was created by the demo', transcript.orderPlaced, lastBotText(transcript).slice(0, 70));
  check('the order has a code', Boolean(transcript.orderCode), transcript.orderCode ?? 'none');

  console.log('\n[1mLimits[0m');
  const exhausted = { ...session, messageCount: DEMO_LIMITS.messagesPerSession };
  let stopped = false;
  try {
    await sendDemoMessage(exhausted, { type: 'text', text: 'again' });
  } catch (error) {
    stopped = error instanceof DemoLimitError;
  }
  check('a session runs out of messages', stopped);

  let ipBlocked = false;
  try {
    for (let i = 0; i < DEMO_LIMITS.sessionsPerHourPerIp + 2; i++) {
      await createSession('flood-test-ip');
    }
  } catch (error) {
    ipBlocked = error instanceof DemoLimitError;
  }
  check('too many sessions from one address is refused', ipBlocked);

  console.log('\n[1mCleanup[0m');
  const { data: reaped } = await supabaseAdmin().rpc('reap_demo_sessions', {
    older_than: '0 seconds',
  });
  check('stale sessions are reaped', (reaped ?? 0) > 0, `${reaped} removed`);

  const { count } = await supabaseAdmin()
    .from('demo_sessions')
    .select('id', { count: 'exact', head: true });
  check('no demo sessions left behind', (count ?? 0) === 0, `${count} remaining`);

  console.log(
    `\n[1m${failed === 0 ? '[32mAll checks passed' : '[31mFailures'}[0m  ${passed} passed, ${failed} failed\n`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\n[31mDemo check crashed:[0m', error);
  process.exit(1);
});
