import type { Json } from '@/lib/database.types';
import { hasMetaConfig } from '@/lib/env';
import { APP } from '@/lib/routes';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Pilot onboarding checklist.
 *
 * Internal tooling, on purpose. Self-serve signup, Embedded Signup and Tech
 * Provider verification are all real work, and all of it is worth less right now
 * than getting three to five real businesses live by hand and finding out what
 * actually breaks.
 *
 * Almost every item is DERIVED rather than ticked. A checklist of manual
 * checkboxes tells you what somebody remembered to click; this one tells you
 * what is true. The two items that cannot be derived — whether the owner was
 * actually walked through the product, and whether a follow-up is booked — are
 * stored explicitly and marked as such.
 */

export type StepState = 'done' | 'blocked' | 'todo';

export interface ChecklistStep {
  id: string;
  title: string;
  /** What this is for, in the words you would use to the client. */
  body: string;
  state: StepState;
  /** Shown when done — the evidence, not a tick. */
  evidence?: string;
  /** Why it cannot be started yet. */
  blockedBy?: string;
  action?: { label: string; href: string };
  /** True for the two items a person confirms rather than the system observing. */
  manual?: boolean;
}

export interface Checklist {
  steps: ChecklistStep[];
  doneCount: number;
  /** True once a real customer has had a real automated conversation. */
  isLive: boolean;
}

/** The two things nobody can detect from the data. */
export interface ManualConfirmations {
  ownerWalkthroughAt: string | null;
  feedbackCallAt: string | null;
}

export function readManual(settings: Json | null): ManualConfirmations {
  const bag =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? ((settings as Record<string, unknown>).onboarding as Record<string, unknown> | undefined)
      : undefined;

  return {
    ownerWalkthroughAt: typeof bag?.ownerWalkthroughAt === 'string' ? bag.ownerWalkthroughAt : null,
    feedbackCallAt: typeof bag?.feedbackCallAt === 'string' ? bag.feedbackCallAt : null,
  };
}

export async function setManualConfirmation(
  ctx: WorkspaceContext,
  key: keyof ManualConfirmations,
  done: boolean
): Promise<void> {
  ctx.requireRole('admin');

  const existing =
    ctx.workspace.settings &&
    typeof ctx.workspace.settings === 'object' &&
    !Array.isArray(ctx.workspace.settings)
      ? (ctx.workspace.settings as Record<string, unknown>)
      : {};

  const onboarding = readManual(ctx.workspace.settings);
  onboarding[key] = done ? new Date().toISOString() : null;

  const { error } = await ctx.db
    .from('workspaces')
    .update({ settings: { ...existing, onboarding } as unknown as Json })
    .eq('id', ctx.workspaceId);

  if (error) throw new Error(`Could not save that: ${error.message}`);
}

export async function loadChecklist(ctx: WorkspaceContext): Promise<Checklist> {
  const manual = readManual(ctx.workspace.settings);

  // Seven independent counts. Run together — sequentially this screen would cost
  // nearly two seconds of round trips for information nobody needs staged.
  const [channels, deliveries, catalogItems, flows, realConversations, botMessages, orders] =
    await Promise.all([
      ctx
        .table('channels')
        .select<{ id: string; status: string; display_name: string; phone_number: string | null }>(
          'id, status, display_name, phone_number'
        )
        .neq('type', 'simulator'),

      // Evidence the webhook is genuinely wired: a signed payload Meta sent us.
      ctx.db
        .from('webhook_deliveries')
        .select('created_at')
        .eq('workspace_id', ctx.workspaceId)
        .eq('source', 'meta')
        .eq('signature_ok', true)
        .order('created_at', { ascending: false })
        .limit(1),

      ctx.db
        .from('catalog_items')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspaceId)
        .eq('available', true),

      ctx
        .table('flows')
        .select<{ id: string; name: string }>('id, name')
        .eq('status', 'published')
        .limit(1),

      // A conversation on a real channel, i.e. not the simulator.
      ctx.db
        .from('conversations')
        .select('id, created_at, channel:channels!inner(type)')
        .eq('workspace_id', ctx.workspaceId)
        .neq('channel.type', 'simulator')
        .order('created_at', { ascending: true })
        .limit(1),

      ctx.db
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspaceId)
        .eq('author', 'flow'),

      ctx.db
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', ctx.workspaceId)
        .eq('placed_by', 'flow'),
    ]);

  const connected = (channels.data ?? []).filter((c) => c.status === 'connected');
  const hasNumber = connected.length > 0;
  const webhookAt = deliveries.data?.[0]?.created_at as string | undefined;
  const itemCount = catalogItems.count ?? 0;
  const publishedFlow = (flows.data ?? [])[0] ?? null;
  const firstConversation = realConversations.data?.[0] as { created_at: string } | undefined;
  const botMessageCount = botMessages.count ?? 0;
  const orderCount = orders.count ?? 0;

  const steps: ChecklistStep[] = [
    {
      id: 'server',
      title: 'Meta credentials on the server',
      body: 'META_APP_SECRET and META_WEBHOOK_VERIFY_TOKEN have to be set in the environment before any number can be connected or any webhook accepted.',
      state: hasMetaConfig() ? 'done' : 'todo',
      evidence: hasMetaConfig() ? 'Present in this environment' : undefined,
    },
    {
      id: 'number',
      title: 'WhatsApp number connected',
      body: 'Paste the phone number ID and a permanent access token from the client’s Meta dashboard. We verify the token against the Graph API before saving it.',
      state: hasNumber ? 'done' : hasMetaConfig() ? 'todo' : 'blocked',
      blockedBy: hasMetaConfig() ? undefined : 'Meta credentials are not set on the server yet',
      evidence: hasNumber
        ? connected.map((c) => c.phone_number ?? c.display_name).join(', ')
        : undefined,
      action: { label: 'Connect a number', href: APP.channels },
    },
    {
      id: 'webhook',
      title: 'Webhook receiving from Meta',
      body: 'Set the callback URL in the Meta dashboard and subscribe to the messages field. This turns green the first time Meta sends us a correctly signed payload — which is the only proof that actually matters.',
      state: webhookAt ? 'done' : hasNumber ? 'todo' : 'blocked',
      blockedBy: hasNumber ? undefined : 'Connect the number first',
      evidence: webhookAt ? `First signed delivery ${shortDate(webhookAt)}` : undefined,
      action: { label: 'Webhook URL', href: APP.channels },
    },
    {
      id: 'catalog',
      title: 'Their menu, products or services loaded',
      body: 'The flow reads prices and availability from here. Ordering and booking flows cannot do anything useful until this is real — and a wrong price is worse than no automation.',
      state: itemCount > 0 ? 'done' : 'todo',
      evidence: itemCount > 0 ? `${itemCount} active item${itemCount === 1 ? '' : 's'}` : undefined,
      action: { label: 'Open menu & services', href: APP.menu },
    },
    {
      id: 'flow',
      title: 'A flow published',
      body: 'Install the template for their industry, adjust the wording to sound like them, test it in the Simulator, then publish. Nothing replies to a customer until a flow is published.',
      state: publishedFlow ? 'done' : 'todo',
      evidence: publishedFlow ? `“${publishedFlow.name}” is live` : undefined,
      action: { label: 'Open flows', href: APP.flows },
    },
    {
      id: 'walkthrough',
      title: 'Owner walked through the inbox and the dashboard',
      body: 'Twenty minutes, in person or on a call. They need to know where handed-over conversations appear and where the hours-saved figure comes from, or they will not trust either.',
      state: manual.ownerWalkthroughAt ? 'done' : 'todo',
      evidence: manual.ownerWalkthroughAt
        ? `Confirmed ${shortDate(manual.ownerWalkthroughAt)}`
        : undefined,
      manual: true,
    },
    {
      id: 'first',
      title: 'First real customer conversation',
      body: 'A message from an actual customer on the connected number — not a test from your own phone. This is the line between a configured account and a live one.',
      state: firstConversation ? 'done' : 'blocked',
      blockedBy: firstConversation ? undefined : 'Waiting on a real customer message',
      evidence: firstConversation ? shortDate(firstConversation.created_at) : undefined,
      action: { label: 'Open inbox', href: APP.inbox },
    },
    {
      id: 'automated',
      title: 'Automation answered a real customer',
      body: 'The flow replied to someone without a person touching it. Until this happens the hours-saved figure is zero, correctly.',
      state: botMessageCount > 0 ? 'done' : 'todo',
      evidence:
        botMessageCount > 0
          ? `${botMessageCount} automated message${botMessageCount === 1 ? '' : 's'} sent${
              orderCount > 0 ? `, ${orderCount} order${orderCount === 1 ? '' : 's'} captured` : ''
            }`
          : undefined,
      action: { label: 'See the numbers', href: APP.dashboard },
    },
    {
      id: 'feedback',
      title: 'Feedback call booked',
      body: 'Two weeks after going live. What they ignore matters as much as what they ask for, and this is the whole reason the pilot is manual.',
      state: manual.feedbackCallAt ? 'done' : 'todo',
      evidence: manual.feedbackCallAt ? `Confirmed ${shortDate(manual.feedbackCallAt)}` : undefined,
      manual: true,
    },
  ];

  return {
    steps,
    doneCount: steps.filter((s) => s.state === 'done').length,
    isLive: Boolean(firstConversation) && botMessageCount > 0,
  };
}

function shortDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
