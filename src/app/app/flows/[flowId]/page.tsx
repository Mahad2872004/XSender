import { notFound } from 'next/navigation';
import { requireWorkspace } from '@/server/auth/session';
import { loadFlowForEditing } from '@/server/flow/drafts';
import { FlowGraphSchema } from '@/lib/schemas/flow';
import FlowBuilder from './FlowBuilder';

export const metadata = { title: 'Flow builder · xSender' };

export default async function FlowBuilderPage(props: PageProps<'/app/flows/[flowId]'>) {
  const { flowId } = await props.params;
  const ctx = await requireWorkspace();

  const loaded = await loadFlowForEditing(ctx, flowId);
  if (!loaded) notFound();

  const { flow, draft } = loaded;

  // A graph that fails to parse would otherwise crash the builder — the one
  // place you would go to fix it. Fall back to a bare trigger instead.
  const parsed = FlowGraphSchema.safeParse(draft.graph);
  const graph = parsed.success
    ? parsed.data
    : {
        nodes: [
          { id: 'trigger', type: 'trigger' as const, position: { x: 80, y: 200 }, config: {} },
        ],
        edges: [],
      };

  return (
    <FlowBuilder
      flowId={flow.id}
      flowName={flow.name}
      versionId={draft.id}
      versionNumber={draft.version}
      isPublished={flow.status === 'published' && flow.published_version_id === draft.id}
      graph={graph}
      entryNodeId={draft.entry_node_id}
    />
  );
}
