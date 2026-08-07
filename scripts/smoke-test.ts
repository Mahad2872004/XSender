/**
 * End-to-end smoke test against a real Supabase project.
 *
 *   npx tsx --env-file=.env scripts/smoke-test.ts
 *   npx tsx --env-file=.env scripts/smoke-test.ts --keep   # leave data behind
 *
 * Exercises the actual server code — tenancy guard, flow publishing, inbound
 * pipeline, router, executor — rather than mocking any of it. Creates two
 * throwaway workspaces, asserts they cannot see each other, runs the restaurant
 * demo end to end, then cleans up.
 */

import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/server/db/admin';
import { workspaceContext, WorkspaceAccessError } from '@/server/db/tenancy';
import {
  installFlowTemplate,
  publishVersion,
  FlowValidationError,
} from '@/server/flow/publish';
import { loadFlowForEditing, saveDraftGraph, unpublishFlow } from '@/server/flow/drafts';
import {
  restaurantOrderGraph,
  RESTAURANT_ORDER_ENTRY,
} from '@/server/flow/templates/restaurant-order';
import { faqGraph, FAQ_ENTRY } from '@/server/flow/templates/faq';
import { loadSimulatorState, sendAsCustomer } from '@/server/simulator/service';
import { seedVerticalData } from '@/server/domain/seed';
import { loadMenu } from '@/server/domain/catalog';
import { availableSlots, createBooking, SlotUnavailableError } from '@/server/domain/bookings';
import { latestOrderForContact, listOrders, nextStatus, setOrderStatus } from '@/server/domain/orders';
import type { Contact, Workspace } from '@/lib/database.types';
import type { WorkspaceContext } from '@/server/db/tenancy';

/** A contact to hang test bookings on, created once and reused. */
async function ensureContact(ctx: WorkspaceContext): Promise<Contact> {
  const { data: existing } = await ctx
    .table('contacts')
    .select()
    .eq('full_name', 'Booking Tester')
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await ctx
    .table('contacts')
    .insert({ full_name: 'Booking Tester', phone: '+923000000001' })
    .select()
    .single();
  if (error || !data) throw new Error(`could not create contact: ${error?.message}`);
  return data;
}

const KEEP = process.argv.includes('--keep');

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

function section(title: string) {
  console.log(`\n[1m${title}[0m`);
}

async function createUser(email: string) {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password: `Smoke-${randomUUID().slice(0, 12)}!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Could not create ${email}: ${error?.message}`);
  return data.user;
}

async function createWorkspace(userId: string, name: string): Promise<Workspace> {
  const { data, error } = await supabaseAdmin().rpc('create_workspace', {
    p_user_id: userId,
    p_name: name,
    p_vertical: 'restaurant',
  });
  if (error || !data) throw new Error(`Could not create workspace: ${error?.message}`);
  return data as Workspace;
}

async function main() {
  const stamp = Date.now();
  const emailA = `smoke-a-${stamp}@xsender.test`;
  const emailB = `smoke-b-${stamp}@xsender.test`;

  section('Accounts and workspaces');
  const userA = await createUser(emailA);
  const userB = await createUser(emailB);
  check('two auth users created', Boolean(userA.id && userB.id));

  const wsA = await createWorkspace(userA.id, 'Cafe Delight');
  const wsB = await createWorkspace(userB.id, 'Rival Diner');
  check('two workspaces created', wsA.id !== wsB.id);
  check('slugs are distinct', wsA.slug !== wsB.slug, `${wsA.slug} vs ${wsB.slug}`);

  const ctxA = await workspaceContext(userA.id, wsA.id);
  const ctxB = await workspaceContext(userB.id, wsB.id);
  check('owner role assigned by bootstrap', ctxA.role === 'owner', ctxA.role);

  // create_workspace also provisions the simulator channel in the same transaction.
  const { data: simChannel } = await ctxA.table('channels').select().eq('type', 'simulator').maybeSingle();
  check('simulator channel provisioned on signup', Boolean(simChannel));

  section('Tenant isolation');
  let crossAccessBlocked = false;
  try {
    await workspaceContext(userA.id, wsB.id);
  } catch (error) {
    crossAccessBlocked = error instanceof WorkspaceAccessError;
  }
  check('user A cannot open user B’s workspace', crossAccessBlocked);

  // Write a contact in B, then confirm A's scoped queries cannot see it.
  await ctxB.table('contacts').insert({ full_name: 'Secret Customer', phone: '+920000000000' });
  const { data: aSeesB } = await ctxA.table('contacts').select().eq('full_name', 'Secret Customer');
  check('A’s scoped query cannot read B’s contact', (aSeesB ?? []).length === 0);

  const { data: bSeesOwn } = await ctxB.table('contacts').select().eq('full_name', 'Secret Customer');
  check('B can read its own contact', (bSeesOwn ?? []).length === 1);

  section('Publishing the restaurant flow');
  const { flow, version } = await installFlowTemplate(ctxA, {
    name: 'Restaurant ordering',
    vertical: 'restaurant',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    graph: restaurantOrderGraph('Cafe Delight'),
    entryNodeId: RESTAURANT_ORDER_ENTRY,
    publish: true,
  });
  check('flow published', flow.status === 'published' && Boolean(version.id));

  section('Draft and version lifecycle');
  {
    // Installing from the gallery must produce a draft, never something live.
    const installed = await installFlowTemplate(ctxA, {
      name: 'FAQ auto-reply',
      trigger: { type: 'message_received', match: 'keyword', keywords: ['hours'] },
      graph: faqGraph('Cafe Delight'),
      entryNodeId: FAQ_ENTRY,
      publish: false,
    });
    check('gallery install lands as a draft', installed.flow.status === 'draft');

    const loaded = await loadFlowForEditing(ctxA, installed.flow.id);
    check('builder can load the draft', loaded?.draft.id === installed.version.id);
    check('nothing published yet', loaded?.published === null);

    // Editing a draft updates it in place.
    const edited = faqGraph('Cafe Delight');
    edited.nodes[0].position = { x: 999, y: 111 };
    const saved = await saveDraftGraph(
      ctxA,
      installed.flow.id,
      installed.version.id,
      edited,
      FAQ_ENTRY
    );
    check('editing a draft updates it in place', saved.id === installed.version.id);

    await publishVersion(ctxA, installed.flow.id, installed.version.id);

    // Editing a *published* version must fork, so live conversations pinned to
    // it keep running the graph they started on.
    const forked = await saveDraftGraph(
      ctxA,
      installed.flow.id,
      installed.version.id,
      edited,
      FAQ_ENTRY
    );
    check('editing a published version forks a new draft', forked.id !== installed.version.id);
    check('forked version increments', forked.version === installed.version.version + 1);

    // A graph with a dangling branch must be refused, not shipped.
    const broken = faqGraph('Cafe Delight');
    broken.edges = broken.edges.filter((e) => e.sourceHandle !== 'hours');
    const brokenVersion = await saveDraftGraph(
      ctxA,
      installed.flow.id,
      forked.id,
      broken,
      FAQ_ENTRY
    );
    let refused = false;
    try {
      await publishVersion(ctxA, installed.flow.id, brokenVersion.id);
    } catch (error) {
      refused = error instanceof FlowValidationError;
    }
    check('publishing a graph with a dead end is refused', refused);

    // Keep this flow out of the way of the ordering test below.
    await unpublishFlow(ctxA, installed.flow.id);
    await ctxA.table('flows').delete().eq('id', installed.flow.id);
  }

  section('Seeding the catalog and bookable resources');
  const seeded = await seedVerticalData(ctxA, 'restaurant');
  check('menu items seeded', seeded.items > 0, `${seeded.items} items`);
  check('tables seeded with opening hours', seeded.resources > 0, `${seeded.resources} tables`);

  const menu = await loadMenu(ctxA);
  check('menu groups by category', menu.length > 0, `${menu.length} categories`);
  const biryani = menu.flatMap((g) => g.items).find((i) => i.name === 'Beef Biryani');
  check('Beef Biryani priced in minor units', biryani?.price_minor === 75000, String(biryani?.price_minor));

  section('Availability engine');
  {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const slots = await availableSlots(ctxA, { date: tomorrow, partySize: 2 });
    check('slots generated from opening hours', slots.length > 0, `${slots.length} slots`);
    check(
      'no slot is offered in the past',
      slots.every((s) => s.startsAt > new Date())
    );

    // A party of six must not be offered a table for four.
    const bigParty = await availableSlots(ctxA, { date: tomorrow, partySize: 6 });
    check(
      'small tables are not offered to a large party',
      bigParty.length < slots.length,
      `${bigParty.length} vs ${slots.length}`
    );

    // Claim a slot, then confirm the same one is no longer offered.
    const target = slots[0];
    const booking = await createBooking(ctxA, {
      contactId: (await ensureContact(ctxA)).id,
      resourceId: target.resourceId,
      startsAt: target.startsAt,
      endsAt: target.endsAt,
      partySize: 2,
    });
    check('booking created with a code', booking.code.startsWith('BK-'), booking.code);

    const afterBooking = await availableSlots(ctxA, { date: tomorrow, partySize: 2 });
    const stillOffered = afterBooking.some(
      (s) => s.resourceId === target.resourceId && s.startsAt.getTime() === target.startsAt.getTime()
    );
    check('the booked slot is no longer offered', !stillOffered);

    // The database must refuse a second booking on the same resource and time,
    // which is the race two customers can genuinely hit.
    let refused = false;
    try {
      await createBooking(ctxA, {
        contactId: (await ensureContact(ctxA)).id,
        resourceId: target.resourceId,
        startsAt: target.startsAt,
        endsAt: target.endsAt,
        partySize: 2,
      });
    } catch (error) {
      refused = error instanceof SlotUnavailableError;
    }
    check('double-booking is refused by the database', refused);
  }

  section('Golden path — order a Beef Biryani, no human involved');

  async function say(payload: Parameters<typeof sendAsCustomer>[1], label: string) {
    await sendAsCustomer(ctxA, payload);
    const state = await loadSimulatorState(ctxA);
    const last = state.messages.at(-1);
    console.log(
      `    [90m→ ${label}[0m  bot: ${JSON.stringify(last?.payload ?? {}).slice(0, 90)}`
    );
    return state;
  }

  await say({ type: 'text', text: 'hi' }, 'customer says "hi"');
  let state = await loadSimulatorState(ctxA);
  check('flow started on first message', state.run?.status === 'awaiting_input');
  check('welcome message sent', state.messages.some((m) => m.direction === 'outbound'));

  // The bot now offers the workspace's real menu, so the ids the customer taps
  // are the catalog's own — not hardcoded strings in the template.
  const mainsCategory = menu.find((g) => g.items.some((i) => i.id === biryani?.id));
  check('Beef Biryani sits in a category', Boolean(mainsCategory), mainsCategory?.category.name);

  await say({ type: 'reply', replyId: 'order', title: 'View Menu' }, 'taps View Menu');
  await say(
    { type: 'reply', replyId: mainsCategory!.category.id, title: mainsCategory!.category.name },
    `picks ${mainsCategory!.category.name}`
  );
  await say({ type: 'reply', replyId: biryani!.id, title: 'Beef Biryani' }, 'picks Beef Biryani');

  state = await loadSimulatorState(ctxA);
  const vars = (state.run?.variables ?? {}) as Record<string, unknown>;
  check('item added to the cart', Array.isArray(vars.cart) && (vars.cart as unknown[]).length === 1);
  check('cart total priced from the catalog', vars.cart_total === 'Rs. 750', String(vars.cart_total));

  await say({ type: 'reply', replyId: 'checkout', title: 'Checkout' }, 'checks out');
  await say({ type: 'reply', replyId: 'delivery', title: 'Delivery' }, 'chooses Delivery');
  await say({ type: 'text', text: '12 Jinnah Road, Lahore' }, 'gives address');
  await say({ type: 'reply', replyId: 'cash', title: 'Cash on delivery' }, 'pays cash on delivery');

  state = await loadSimulatorState(ctxA);
  check('run completed', state.run?.status === 'completed', String(state.run?.status));
  check('run recorded no error', !state.run?.error, state.run?.error ?? '');

  const finalVars = (state.run?.variables ?? {}) as Record<string, unknown>;
  check('address captured', finalVars.address === '12 Jinnah Road, Lahore');
  check('fulfilment captured', finalVars.fulfilment === 'Delivery');
  check('cart emptied after checkout', Array.isArray(finalVars.cart) && (finalVars.cart as unknown[]).length === 0);

  const confirmation = state.messages.at(-1);
  const confirmationText =
    confirmation?.payload && typeof confirmation.payload === 'object'
      ? String((confirmation.payload as { text?: string }).text ?? '')
      : '';
  check('confirmation mentions the ETA', confirmationText.includes('35'), confirmationText.slice(0, 60));

  section('The order is a real record, not just a transcript');
  {
    const orders = await listOrders(ctxA, { status: 'all' });
    check('an order row exists', orders.length === 1, `${orders.length} orders`);

    const placed = orders[0];
    check('order code allocated per workspace', placed?.code?.startsWith('XS-'), placed?.code);
    check('total taken from the catalog price', placed?.total_minor === 75000, String(placed?.total_minor));
    check('line item snapshotted', placed?.items[0]?.name === 'Beef Biryani');
    check('attributed to automation, not staff', placed?.placed_by === 'flow');
    check('delivery address stored', placed?.address === '12 Jinnah Road, Lahore');
    check('linked to the conversation it came from', Boolean(placed?.conversation_id));
    check('confirmation code appears in the chat', confirmationText.includes(placed.code));

    // "Track my order" must resolve without the customer typing a code.
    const latest = await latestOrderForContact(ctxA, placed.contact_id);
    check('latest order resolves from the contact alone', latest?.id === placed.id);

    // Staff advancing the status is the ROI moment: one tap, customer told.
    const advanceTo = nextStatus(placed);
    check('pipeline offers a next status', advanceTo === 'preparing', String(advanceTo));
    const advanced = await setOrderStatus(ctxA, placed.id, advanceTo!);
    check('status advanced', advanced.status === 'preparing');
  }

  section('Run inspector');
  check('every step recorded', state.steps.length > 0, `${state.steps.length} steps`);
  check(
    'no step failed',
    state.steps.every((s) => s.outcome !== 'failed'),
    state.steps.find((s) => s.outcome === 'failed')?.node_id ?? ''
  );
  const branches = state.steps.filter((s) => (s.detail as { handle?: string })?.handle).length;
  check('branch decisions logged', branches > 0, `${branches} branches`);

  section('Handoff path — anything the bot cannot parse reaches a human');
  await sendAsCustomer(ctxA, { type: 'text', text: 'hi again' });
  await sendAsCustomer(ctxA, { type: 'reply', replyId: 'staff', title: 'Talk to Staff' });

  const afterHandoff = await loadSimulatorState(ctxA);
  check('conversation flagged for a human', afterHandoff.conversation?.needs_human === true);
  check('conversation moved to pending', afterHandoff.conversation?.status === 'pending');

  const { data: handoffEvents } = await ctxA
    .table('events')
    .select()
    .eq('type', 'automation.handoff');
  check('handoff recorded as an event for ROI reporting', (handoffEvents ?? []).length > 0);

  section('ROI event stream');
  const { data: sentEvents } = await ctxA
    .table('events')
    .select()
    .eq('type', 'automation.messages_sent');
  const autoHandled = (sentEvents ?? []).reduce(
    (sum, e) => sum + Number((e.payload as { count?: number })?.count ?? 0),
    0
  );
  check('automated messages counted', autoHandled > 0, `${autoHandled} messages auto-sent`);

  if (!KEEP) {
    section('Cleanup');
    // Workspaces must be deleted explicitly. workspaces.created_by is
    // ON DELETE SET NULL by design — removing one member must not destroy a
    // workspace the rest of the team still uses — so deleting the user alone
    // would leave the workspace orphaned.
    await supabaseAdmin().from('workspaces').delete().in('id', [wsA.id, wsB.id]);
    await supabaseAdmin().auth.admin.deleteUser(userA.id);
    await supabaseAdmin().auth.admin.deleteUser(userB.id);

    const { data: leftovers } = await supabaseAdmin()
      .from('workspaces')
      .select('id')
      .in('id', [wsA.id, wsB.id]);
    check('workspaces removed', (leftovers ?? []).length === 0);

    // Everything below a workspace should have gone with it.
    const { data: orphanMessages } = await supabaseAdmin()
      .from('messages')
      .select('id')
      .in('workspace_id', [wsA.id, wsB.id]);
    check('messages cascaded away', (orphanMessages ?? []).length === 0);

    const { data: orphanRuns } = await supabaseAdmin()
      .from('flow_runs')
      .select('id')
      .in('workspace_id', [wsA.id, wsB.id]);
    check('flow runs cascaded away', (orphanRuns ?? []).length === 0);
  } else {
    console.log(`\n  kept workspace ${wsA.slug} (${emailA})`);
  }

  console.log(
    `\n[1m${failed === 0 ? '[32mAll checks passed' : '[31mFailures'}[0m  ${passed} passed, ${failed} failed\n`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\n[31mSmoke test crashed:[0m', error);
  process.exit(1);
});
