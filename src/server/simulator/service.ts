import type {
  Channel,
  Contact,
  Conversation,
  FlowRun,
  FlowRunStep,
  Message,
} from '@/lib/database.types';
import { MessagePayloadSchema, type MessagePayload } from '@/lib/schemas/message';
import type { InboundMessage } from '@/server/channels/types';
import { receiveInboundMessage } from '@/server/messaging/inbound';
import { cancelActiveRun } from '@/server/flow/router';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Simulator plumbing.
 *
 * The simulator is a real channel, not a mock: messages go through the same
 * inbound pipeline, the same router, and the same executor as WhatsApp will.
 * That is the point — what you debug here is what runs in production.
 */

/** Stable pseudo-customer, so the same test contact is reused between sessions. */
const SIMULATED_CUSTOMER_ID = 'sim-customer';
const SIMULATED_CUSTOMER_NAME = 'Test Customer';

export async function simulatorChannel(ctx: WorkspaceContext): Promise<Channel> {
  const { data, error } = await ctx
    .table('channels')
    .select()
    .eq('type', 'simulator')
    .maybeSingle();

  if (error) throw new Error(`Could not load the simulator channel: ${error.message}`);

  if (data) return data;

  // Workspaces created before the simulator existed, or by a path that skipped
  // create_workspace, still get one on demand.
  const { data: created, error: createError } = await ctx
    .table('channels')
    .insert({
      type: 'simulator',
      status: 'connected',
      display_name: 'Simulator',
      connected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !created) {
    throw new Error(`Could not create the simulator channel: ${createError?.message}`);
  }

  return created as Channel;
}

export interface SimulatorState {
  channel: Channel;
  conversation: Conversation | null;
  contact: Contact | null;
  messages: Message[];
  run: FlowRun | null;
  steps: FlowRunStep[];
}

/**
 * Load everything the simulator screen needs.
 *
 * Structured as three dependency stages rather than six sequential awaits.
 * Each round trip costs ~265ms, so running the independent reads together
 * takes this from roughly 1.6s to 0.8s.
 */
export async function loadSimulatorState(ctx: WorkspaceContext): Promise<SimulatorState> {
  // One query for conversation + channel + contact, using an inner join on the
  // channel so the simulator channel does not need looking up first. Six
  // separate reads cost ~1.6s at ~265ms per round trip; this path costs two.
  const { data: joined } = await ctx.db
    .from('conversations')
    .select('*, channel:channels!inner(*), contact:contacts(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('channel.type', 'simulator')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = joined as unknown as
    | (Conversation & { channel: Channel; contact: Contact | null })
    | null;

  if (!row) {
    // No conversation yet — the only case that needs a separate channel read.
    const channel = await simulatorChannel(ctx);
    return { channel, conversation: null, contact: null, messages: [], run: null, steps: [] };
  }

  const { channel, contact, ...conversation } = row;

  // Messages, and the latest run with its steps embedded, in one round trip.
  const [messagesResult, runResult] = await Promise.all([
    ctx
      .table('messages')
      .select()
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(200),
    ctx.db
      .from('flow_runs')
      .select('*, steps:flow_run_steps(*)')
      .eq('workspace_id', ctx.workspaceId)
      .eq('conversation_id', conversation.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const runRow = runResult.data as unknown as
    | (FlowRun & { steps: FlowRunStep[] })
    | null;

  const { steps = [], ...run } = runRow ?? ({} as FlowRun & { steps: FlowRunStep[] });

  return {
    channel,
    conversation: conversation as Conversation,
    contact: contact ?? null,
    messages: messagesResult.data ?? [],
    run: runRow ? (run as FlowRun) : null,
    // The embed returns steps unordered; the inspector reads top to bottom.
    steps: [...steps].sort((a, b) => a.id - b.id),
  };
}

/** Send a message as the simulated customer and run the engine on it. */
export async function sendAsCustomer(
  ctx: WorkspaceContext,
  payload: MessagePayload
): Promise<void> {
  const parsed = MessagePayloadSchema.parse(payload);
  const channel = await simulatorChannel(ctx);

  const input: InboundMessage = {
    // No external id: the simulator has no platform to deduplicate against, and
    // repeated identical test messages must not be swallowed.
    externalId: null,
    externalUserId: SIMULATED_CUSTOMER_ID,
    channelType: 'simulator',
    payload: parsed,
    senderName: SIMULATED_CUSTOMER_NAME,
    timestamp: new Date(),
  };

  await receiveInboundMessage(ctx, channel, input);
}

/**
 * Clear the simulated conversation so the first-contact path can be tested
 * again. Resolves rather than deletes, keeping the history for the Inbox.
 */
export async function resetSimulator(ctx: WorkspaceContext): Promise<void> {
  const channel = await simulatorChannel(ctx);

  const { data: conversations } = await ctx
    .table('conversations')
    .select()
    .eq('channel_id', channel.id)
    .neq('status', 'resolved');

  for (const conversation of conversations ?? []) {
    await cancelActiveRun(ctx, conversation.id, 'simulator reset');
    await ctx
      .table('conversations')
      .update({ status: 'resolved', needs_human: false, unread_count: 0 })
      .eq('id', conversation.id);
  }
}
