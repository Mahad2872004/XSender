import { TriggerConfigSchema } from '@/lib/schemas/flow';
import { inboundMatchValue } from '@/lib/schemas/message';
import type { Channel, Contact, Conversation, Flow, FlowRun, FlowVersion, Json } from '@/lib/database.types';
import type { InboundMessage } from '@/server/channels/types';
import type { WorkspaceContext } from '@/server/db/tenancy';
import {
  resumeRunWithInput,
  startRun,
  type ExecutionContext,
  type ExecutionOutcome,
} from './executor';

/**
 * Decides what an inbound message should do.
 *
 * Order matters and is deliberate:
 *   1. A human has taken over  → do nothing, automation stays out of the way.
 *   2. A run is parked waiting → feed it the reply.
 *   3. Otherwise               → find a matching published flow and start it.
 */
export async function handleInboundMessage(
  ctx: WorkspaceContext,
  params: {
    conversation: Conversation;
    contact: Contact;
    channel: Channel;
    recipientExternalId: string;
    input: InboundMessage;
    /** Pass it in if already fetched; saves a round trip. */
    activeRun?: { run: FlowRun; version: FlowVersion } | null;
  }
): Promise<ExecutionOutcome | null> {
  const { conversation, input } = params;

  // A conversation a person has claimed is theirs until they release it.
  if (conversation.needs_human) return null;

  const execution: ExecutionContext = {
    ctx,
    conversation,
    contact: params.contact,
    channel: params.channel,
    recipientExternalId: params.recipientExternalId,
  };

  const active =
    params.activeRun !== undefined
      ? params.activeRun
      : await findActiveRun(ctx, conversation.id);

  if (active) {
    if (active.run.status === 'awaiting_input') {
      return resumeRunWithInput(execution, active.run, active.version, input);
    }
    // Sleeping or mid-execution: the customer wrote while the flow was busy.
    // Leave it alone — the worker owns waking it, and interrupting would lose
    // whatever the sleeping branch was about to do.
    return null;
  }

  const match = await findMatchingFlow(ctx, input);
  if (!match) return null;

  return startRun(execution, match.flow.id, match.version, {
    contact_name: params.contact.full_name ?? '',
    contact_phone: params.contact.phone ?? '',
    channel: params.channel.type,
    last_message: inboundMatchValue(input.payload),
  });
}

export async function findActiveRun(
  ctx: WorkspaceContext,
  conversationId: string
): Promise<{ run: FlowRun; version: FlowVersion } | null> {
  const { data, error } = await ctx.db
    .from('flow_runs')
    .select('*, version:flow_versions(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('conversation_id', conversationId)
    .in('status', ['running', 'awaiting_input', 'sleeping'])
    .maybeSingle();

  if (error) throw new Error(`Could not load the active flow run: ${error.message}`);
  if (!data?.version) return null;

  const { version, ...run } = data as unknown as FlowRun & { version: FlowVersion };
  return { run: run as FlowRun, version };
}

/**
 * First published flow whose trigger matches, by ascending priority.
 *
 * first_contact is checked against the conversation's message count so a
 * welcome flow fires once rather than on every "hi".
 */
async function findMatchingFlow(
  ctx: WorkspaceContext,
  input: InboundMessage
): Promise<{ flow: Flow; version: FlowVersion } | null> {
  const { data, error } = await ctx.db
    .from('flows')
    .select('*, version:flow_versions!flows_published_version_fk(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('status', 'published')
    .not('published_version_id', 'is', null)
    .order('priority', { ascending: true });

  if (error) throw new Error(`Could not load flows: ${error.message}`);

  const text = inboundMatchValue(input.payload).toLowerCase();

  for (const row of (data ?? []) as unknown as Array<Flow & { version: FlowVersion | null }>) {
    if (!row.version) continue;

    const trigger = TriggerConfigSchema.safeParse(row.trigger);
    if (!trigger.success || trigger.data.type !== 'message_received') continue;

    const { match, keywords } = trigger.data;

    if (match === 'any') return { flow: row, version: row.version };

    if (match === 'keyword') {
      if (keywords.some((k) => text.includes(k.toLowerCase()))) {
        return { flow: row, version: row.version };
      }
      continue;
    }

    if (match === 'first_contact') {
      // Handled by the caller, which knows the conversation's history.
      return { flow: row, version: row.version };
    }
  }

  return null;
}

/** Cancel a conversation's active run — used when an agent takes over. */
export async function cancelActiveRun(
  ctx: WorkspaceContext,
  conversationId: string,
  reason: string
): Promise<void> {
  await ctx
    .table('flow_runs')
    .update({
      status: 'cancelled',
      error: reason,
      ended_at: new Date().toISOString(),
      resume_at: null,
      awaiting: null as unknown as Json,
    })
    .eq('conversation_id', conversationId)
    .in('status', ['running', 'awaiting_input', 'sleeping']);
}
