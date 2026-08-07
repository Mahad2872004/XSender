import type { Flow, FlowVersion, Json } from '@/lib/database.types';
import type { FlowGraph } from '@/lib/schemas/flow';
import { FlowGraphSchema } from '@/lib/schemas/flow';
import type { WorkspaceContext } from '@/server/db/tenancy';
import { addVersion } from './publish';

/**
 * Draft editing.
 *
 * The builder never edits a published version in place. Published graphs are
 * immutable because live conversations are pinned to them — rewriting one
 * underneath a customer half-way through checkout would corrupt their run.
 * Editing a published flow forks a new draft version instead.
 */

export interface FlowWithVersions {
  flow: Flow;
  /** The version the builder edits. */
  draft: FlowVersion;
  /** Currently live version, if any. */
  published: FlowVersion | null;
  /** Newest first, for the version history panel. */
  history: FlowVersion[];
}

export async function loadFlowForEditing(
  ctx: WorkspaceContext,
  flowId: string
): Promise<FlowWithVersions | null> {
  const { data: flow } = await ctx.table('flows').select().eq('id', flowId).maybeSingle();
  if (!flow) return null;

  const { data: versions } = await ctx
    .table('flow_versions')
    .select()
    .eq('flow_id', flowId)
    .order('version', { ascending: false })
    .limit(25);

  const history = versions ?? [];
  const published = history.find((v) => v.id === flow.published_version_id) ?? null;

  // Newest version is the working draft, unless it is the published one — in
  // which case the fork happens on first save, not now, so merely opening a
  // published flow does not litter the history with empty versions.
  const draft = history[0];
  if (!draft) return null;

  return { flow, draft, published, history };
}

/**
 * Persist the builder's graph.
 *
 * Returns the version actually written, which may be a new one if the caller
 * was editing a published version.
 */
export async function saveDraftGraph(
  ctx: WorkspaceContext,
  flowId: string,
  versionId: string,
  graph: FlowGraph,
  entryNodeId: string
): Promise<FlowVersion> {
  ctx.requireRole('admin');

  const parsed = FlowGraphSchema.parse(graph);

  const { data: flow } = await ctx.table('flows').select().eq('id', flowId).maybeSingle();
  if (!flow) throw new Error('That flow does not exist.');

  const editingPublished = flow.published_version_id === versionId;

  if (editingPublished) {
    return addVersion(ctx, flowId, parsed, entryNodeId, 'Edited from the published version');
  }

  const { data, error } = await ctx
    .table('flow_versions')
    .update({
      graph: parsed as unknown as Json,
      entry_node_id: entryNodeId,
    })
    .eq('id', versionId)
    .select()
    .single();

  if (error || !data) throw new Error(`Could not save the flow: ${error?.message}`);
  return data;
}

/** Copy an old version to the top of the stack, so rollback is itself undoable. */
export async function restoreVersion(
  ctx: WorkspaceContext,
  flowId: string,
  versionId: string
): Promise<FlowVersion> {
  ctx.requireRole('admin');

  const { data: source } = await ctx
    .table('flow_versions')
    .select()
    .eq('id', versionId)
    .eq('flow_id', flowId)
    .maybeSingle();

  if (!source) throw new Error('That version does not exist.');

  const graph = FlowGraphSchema.parse(source.graph);
  return addVersion(ctx, flowId, graph, source.entry_node_id, `Restored from v${source.version}`);
}

/** Take a flow offline without deleting it. In-flight runs finish as they are. */
export async function unpublishFlow(ctx: WorkspaceContext, flowId: string): Promise<void> {
  ctx.requireRole('admin');

  const { error } = await ctx
    .table('flows')
    .update({ status: 'draft', published_version_id: null })
    .eq('id', flowId);

  if (error) throw new Error(`Could not unpublish: ${error.message}`);
}
