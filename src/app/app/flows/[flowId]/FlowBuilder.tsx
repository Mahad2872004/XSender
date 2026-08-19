'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, CheckCircle2, Loader2, Play, Rocket, Trash2 } from 'lucide-react';
import type { FlowGraph, NodeType } from '@/lib/schemas/flow';
import { outletsFor } from '@/lib/schemas/flow';
import type { ValidationIssue } from '@/server/flow/validate';
import { APP } from '@/lib/routes';
import { checkFlowGraph, publishFlow, saveFlowGraph, takeFlowOffline } from '../actions';
import { FlowNodeCard, type FlowNodeData } from './FlowNodeCard';
import NodePalette from './NodePalette';
import NodeSettings from './NodeSettings';
import { defaultConfigFor } from './node-meta';
import styles from './builder.module.css';

const nodeTypes = { flowNode: FlowNodeCard };

/** How long to wait after the last edit before saving. */
const AUTOSAVE_DELAY_MS = 900;

export interface BuilderProps {
  flowId: string;
  flowName: string;
  versionId: string;
  versionNumber: number;
  isPublished: boolean;
  graph: FlowGraph;
  entryNodeId: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function FlowBuilder(props: BuilderProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({
  flowId,
  flowName,
  versionId: initialVersionId,
  versionNumber,
  isPublished,
  graph,
  entryNodeId,
}: BuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toReactFlowNodes(graph));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toReactFlowEdges(graph));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState(initialVersionId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [publishing, startPublishing] = useTransition();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skips the autosave that would otherwise fire from the initial render.
  const dirtyRef = useRef(false);

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  const currentGraph = useCallback(
    (): FlowGraph => toFlowGraph(nodes, edges),
    [nodes, edges]
  );

  /** Debounced save; edits while a save is in flight simply reschedule. */
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setSaveState('saving');
      const result = await saveFlowGraph({
        flowId,
        versionId,
        entryNodeId,
        graph: currentGraph(),
      });

      if (result.ok) {
        // Editing a published flow forks a new draft; follow it.
        if (result.versionId && result.versionId !== versionId) setVersionId(result.versionId);
        setSaveState('saved');
        setSaveError(null);
      } else {
        setSaveState('error');
        setSaveError(result.message ?? 'Could not save.');
      }

      const check = await checkFlowGraph(currentGraph(), entryNodeId);
      setIssues(check.issues ?? []);
    }, AUTOSAVE_DELAY_MS);
  }, [flowId, versionId, entryNodeId, currentGraph]);

  // Any change to the graph schedules a save.
  useEffect(() => {
    if (!dirtyRef.current && nodes.length > 0) {
      // First render: validate so existing problems surface immediately, but
      // do not write anything back.
      void checkFlowGraph(toFlowGraph(nodes, edges), entryNodeId).then((r) =>
        setIssues(r.issues ?? [])
      );
      dirtyRef.current = true;
      return;
    }
    scheduleSave();
    // scheduleSave is stable per (nodes, edges) via currentGraph.
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Surface validation problems on the nodes themselves.
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const problem = issues.find((i) => i.nodeId === node.id && i.severity === 'error');
        const data = node.data as FlowNodeData;
        if (data.problem === problem?.message) return node;
        return { ...node, data: { ...data, problem: problem?.message } };
      })
    );
  }, [issues, setNodes]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        // One edge per outlet: reconnecting a handle replaces the old target
        // rather than silently creating an ambiguous second branch.
        const cleaned = current.filter(
          (e) =>
            !(e.source === connection.source && e.sourceHandle === connection.sourceHandle)
        );
        return addEdge({ ...connection, id: `e-${crypto.randomUUID().slice(0, 8)}` }, cleaned);
      });
    },
    [setEdges]
  );

  function addNode(type: NodeType) {
    const id = `${type}_${crypto.randomUUID().slice(0, 6)}`;
    const config = defaultConfigFor(type);

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'flowNode',
        // Drop new nodes clear of what is already there.
        position: { x: 220 + current.length * 40, y: 120 + (current.length % 5) * 90 },
        data: {
          nodeType: type,
          config,
          outlets: outletsFor({ id, type, position: { x: 0, y: 0 }, config }),
        } satisfies FlowNodeData,
      },
    ]);
    setSelectedId(id);
  }

  function updateSelected(patch: { label?: string; config?: Record<string, unknown> }) {
    if (!selectedId) return;

    setNodes((current) =>
      current.map((node) => {
        if (node.id !== selectedId) return node;
        const data = node.data as FlowNodeData;
        const config = patch.config ?? data.config;
        return {
          ...node,
          data: {
            ...data,
            ...patch,
            config,
            // Outlets depend on config — editing a question's buttons changes
            // how many exits the card has.
            outlets: outletsFor({
              id: node.id,
              type: data.nodeType,
              position: { x: 0, y: 0 },
              config,
            }),
          },
        };
      })
    );
  }

  function deleteSelected() {
    if (!selectedId) return;
    const data = nodes.find((n) => n.id === selectedId)?.data as FlowNodeData | undefined;
    if (data?.nodeType === 'trigger') return; // the flow needs its entry point

    setNodes((current) => current.filter((n) => n.id !== selectedId));
    setEdges((current) =>
      current.filter((e) => e.source !== selectedId && e.target !== selectedId)
    );
    setSelectedId(null);
  }

  function onPublish() {
    startPublishing(async () => {
      // Flush any pending autosave first, so we publish what is on screen.
      if (timerRef.current) clearTimeout(timerRef.current);
      const saved = await saveFlowGraph({ flowId, versionId, entryNodeId, graph: currentGraph() });
      const targetVersion = saved.versionId ?? versionId;
      if (saved.versionId) setVersionId(saved.versionId);

      const result = await publishFlow(flowId, targetVersion);
      setIssues(result.issues ?? []);
      setBanner({
        tone: result.ok ? 'ok' : 'error',
        text: result.message ?? (result.ok ? 'Published.' : 'Could not publish.'),
      });
    });
  }

  function onTakeOffline() {
    startPublishing(async () => {
      const result = await takeFlowOffline(flowId);
      setBanner({
        tone: result.ok ? 'ok' : 'error',
        text: result.message ?? 'Taken offline.',
      });
    });
  }

  const errorCount = useMemo(
    () => issues.filter((i) => i.severity === 'error').length,
    [issues]
  );

  return (
    <div className={styles.builder}>
      <NodePalette onAdd={addNode} />

      <div className={styles.canvasWrap}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <span className={styles.flowTitle}>{flowName}</span>
            <span className={styles.versionTag}>v{versionNumber}</span>
            {isPublished && <span className={styles.liveTag}>Live</span>}
          </div>

          <div className={styles.toolbarRight}>
            <SaveIndicator state={saveState} error={saveError} />

            <a href={APP.simulator} className={styles.testBtn}>
              <Play size={14} />
              Test in simulator
            </a>

            {isPublished ? (
              <button
                type="button"
                className={styles.offlineBtn}
                onClick={onTakeOffline}
                disabled={publishing}
              >
                Take offline
              </button>
            ) : (
              <button
                type="button"
                className={styles.publishBtn}
                onClick={onPublish}
                disabled={publishing || errorCount > 0}
                title={
                  errorCount > 0
                    ? 'Fix the problems listed below before publishing'
                    : 'Make this flow live'
                }
              >
                <Rocket size={14} />
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            )}
          </div>
        </div>

        {banner && (
          <div className={banner.tone === 'ok' ? styles.bannerOk : styles.bannerError}>
            {banner.tone === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {banner.text}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          fitView
          proOptions={{ hideAttribution: false }}
          defaultEdgeOptions={{ animated: true, style: { strokeWidth: 1.5 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className={styles.minimap} />
        </ReactFlow>

        {issues.length > 0 && (
          <div className={styles.issues}>
            <span className={styles.issuesTitle}>
              {errorCount > 0
                ? `${errorCount} problem${errorCount === 1 ? '' : 's'} to fix before publishing`
                : 'Suggestions'}
            </span>
            <ul className={styles.issueList}>
              {issues.slice(0, 6).map((issue, i) => (
                <li
                  key={`${issue.nodeId ?? 'graph'}-${i}`}
                  className={issue.severity === 'error' ? styles.issueError : styles.issueWarning}
                >
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <NodeSettings
        node={selected}
        onChange={updateSelected}
        onDelete={deleteSelected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'saving') {
    return (
      <span className={styles.saveState}>
        <Loader2 size={13} className={styles.spin} />
        Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className={styles.saveState}>
        <CheckCircle2 size={13} />
        Saved
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className={styles.saveStateError} title={error ?? undefined}>
        <AlertTriangle size={13} />
        Not saved
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Graph ↔ React Flow conversion
// ---------------------------------------------------------------------------

function toReactFlowNodes(graph: FlowGraph): Node[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: 'flowNode',
    position: node.position,
    data: {
      nodeType: node.type,
      label: node.label,
      config: node.config,
      outlets: outletsFor(node),
    } satisfies FlowNodeData,
  }));
}

function toReactFlowEdges(graph: FlowGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    label: edge.sourceHandle && edge.sourceHandle !== 'next' ? edge.sourceHandle : undefined,
  }));
}

function toFlowGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((node) => {
      const data = node.data as FlowNodeData;
      return {
        id: node.id,
        type: data.nodeType,
        position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
        label: data.label,
        config: data.config,
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // React Flow uses null for "no handle"; the schema expects undefined.
      sourceHandle: edge.sourceHandle ?? undefined,
    })),
  };
}

export { FlowBuilder };
