import { z } from 'zod';
import type { Conversation, FlowRun, FlowVersion, Job } from '@/lib/database.types';
import { systemContext, type WorkspaceContext } from '@/server/db/tenancy';
import { registerHandler } from '@/server/queue/handlers';
import { enqueue } from '@/server/queue/jobs';
import { resumeSleepingRun } from './executor';

/**
 * Wakes flow runs parked by a `delay` node.
 *
 * The worker owns this: a Vercel function cannot sit and wait, so the delay
 * node schedules a job and returns.
 */

const PayloadSchema = z.object({ flowRunId: z.string().uuid() });

export function scheduleResume(
  workspaceId: string,
  flowRunId: string,
  resumeAt: Date
): Promise<Job | null> {
  return enqueue({
    type: 'flow.resume',
    workspaceId,
    payload: { flowRunId },
    runAt: resumeAt,
    // Re-scheduling the same run is a no-op rather than a double wake-up.
    dedupeKey: `flow.resume:${flowRunId}`,
  });
}

async function handleResume(job: Job): Promise<void> {
  const { flowRunId } = PayloadSchema.parse(job.payload);

  if (!job.workspace_id) {
    throw new Error(`flow.resume job ${job.id} has no workspace.`);
  }

  const ctx = await systemContext(job.workspace_id);
  const loaded = await loadRunContext(ctx, flowRunId);

  // The run may have been cancelled or answered before the timer fired; that is
  // a normal outcome, not a failure.
  if (!loaded) return;

  await resumeSleepingRun(loaded.execution, loaded.run, loaded.version);
}

async function loadRunContext(ctx: WorkspaceContext, flowRunId: string) {
  const { data, error } = await ctx.db
    .from('flow_runs')
    .select('*, version:flow_versions(*), conversation:conversations(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('id', flowRunId)
    .maybeSingle();

  if (error) throw new Error(`Could not load flow run ${flowRunId}: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as FlowRun & {
    version: FlowVersion | null;
    conversation: Conversation | null;
  };

  if (row.status !== 'sleeping') return null;
  if (!row.version || !row.conversation) return null;

  const { data: contact } = await ctx
    .table('contacts')
    .select('*')
    .eq('id', row.conversation.contact_id)
    .single();

  const { data: channel } = await ctx
    .table('channels')
    .select('*')
    .eq('id', row.conversation.channel_id)
    .single();

  if (!contact || !channel) return null;

  const { data: identity } = await ctx
    .table('contact_identities')
    .select<{ external_id: string }>('external_id')
    .eq('contact_id', row.conversation.contact_id)
    .eq('channel_type', channel.type)
    .maybeSingle();

  const recipientExternalId =
    identity?.external_id ?? contact.phone ?? row.conversation.contact_id;

  const { version, conversation, ...run } = row;

  return {
    run: run as FlowRun,
    version,
    execution: {
      ctx,
      conversation,
      contact,
      channel,
      recipientExternalId,
    },
  };
}

registerHandler('flow.resume', handleResume);
