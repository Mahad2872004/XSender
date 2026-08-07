import type { Flow, FlowVersion, Json } from '@/lib/database.types';
import type { FlowGraph } from '@/lib/schemas/flow';
import type { TriggerConfig } from '@/lib/schemas/flow';
import type { WorkspaceContext } from '@/server/db/tenancy';
import { validateGraph, type ValidationIssue } from './validate';

/**
 * Creating and publishing flow versions.
 *
 * Publishing validates first. A graph with a dead end is refused rather than
 * shipped, because the failure mode is a customer stuck mid-order at 9pm.
 */

export class FlowValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super(
      `This flow has ${issues.filter((i) => i.severity === 'error').length} problem(s) that must be fixed before publishing.`
    );
    this.name = 'FlowValidationError';
  }
}

export async function createFlow(
  ctx: WorkspaceContext,
  input: {
    name: string;
    description?: string;
    vertical?: Flow['vertical'];
    trigger: TriggerConfig;
    priority?: number;
  }
): Promise<Flow> {
  ctx.requireRole('admin');

  const { data, error } = await ctx
    .table('flows')
    .insert({
      name: input.name,
      description: input.description ?? null,
      vertical: input.vertical ?? null,
      trigger: input.trigger as unknown as Json,
      priority: input.priority ?? 100,
      status: 'draft',
      published_version_id: null,
      created_by: ctx.userId === 'system' ? null : ctx.userId,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Could not create flow: ${error?.message}`);
  return data as Flow;
}

export async function addVersion(
  ctx: WorkspaceContext,
  flowId: string,
  graph: FlowGraph,
  entryNodeId: string,
  notes?: string
): Promise<FlowVersion> {
  const { data: latest } = await ctx
    .table('flow_versions')
    .select<{ version: number }>('version')
    .eq('flow_id', flowId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version ?? 0) + 1;

  const { data, error } = await ctx
    .table('flow_versions')
    .insert({
      flow_id: flowId,
      version: nextVersion,
      graph: graph as unknown as Json,
      entry_node_id: entryNodeId,
      notes: notes ?? null,
      created_by: ctx.userId === 'system' ? null : ctx.userId,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Could not save flow version: ${error?.message}`);
  return data as FlowVersion;
}

/**
 * Publish a version.
 *
 * In-flight runs keep pointing at whatever version they started on — moving a
 * customer to a different graph mid-checkout would corrupt their state.
 */
export async function publishVersion(
  ctx: WorkspaceContext,
  flowId: string,
  versionId: string
): Promise<void> {
  ctx.requireRole('admin');

  const { data: version } = await ctx
    .table('flow_versions')
    .select('*')
    .eq('id', versionId)
    .eq('flow_id', flowId)
    .single();

  if (!version) throw new Error('That flow version does not exist.');

  const row = version as FlowVersion;
  const result = validateGraph(row.graph, row.entry_node_id);
  if (!result.valid) throw new FlowValidationError(result.issues);

  const { error } = await ctx
    .table('flows')
    .update({ status: 'published', published_version_id: versionId })
    .eq('id', flowId);

  if (error) throw new Error(`Could not publish flow: ${error.message}`);

  await ctx.table('events').insert({
    type: 'flow.published',
    entity_type: 'flow',
    entity_id: flowId,
    actor_user_id: ctx.userId === 'system' ? null : ctx.userId,
    payload: { versionId, version: row.version } as Json,
  });
}

/** Create, version, and publish in one call — used by the template gallery. */
export async function installFlowTemplate(
  ctx: WorkspaceContext,
  input: {
    name: string;
    description?: string;
    vertical?: Flow['vertical'];
    trigger: TriggerConfig;
    graph: FlowGraph;
    entryNodeId: string;
    publish?: boolean;
  }
): Promise<{ flow: Flow; version: FlowVersion }> {
  const validation = validateGraph(input.graph, input.entryNodeId);
  if (!validation.valid) throw new FlowValidationError(validation.issues);

  const flow = await createFlow(ctx, {
    name: input.name,
    description: input.description,
    vertical: input.vertical,
    trigger: input.trigger,
  });

  const version = await addVersion(
    ctx,
    flow.id,
    input.graph,
    input.entryNodeId,
    'Installed from template'
  );

  if (input.publish !== false) {
    await publishVersion(ctx, flow.id, version.id);

    // Re-read: `flow` was captured before publishing, so returning it as-is
    // would hand the caller a stale 'draft' status.
    const { data: published } = await ctx
      .table('flows')
      .select()
      .eq('id', flow.id)
      .single();

    if (published) return { flow: published, version };
  }

  return { flow, version };
}
