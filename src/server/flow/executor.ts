import {
  FlowGraphSchema,
  NODE_CONFIG_SCHEMAS,
  type FlowGraph,
  type FlowNode,
} from '@/lib/schemas/flow';
import type {
  Channel,
  Contact,
  Conversation,
  Json,
} from '@/lib/database.types';
import type { OutboundPayload } from '@/lib/schemas/message';
import type { InboundMessage } from '@/server/channels/types';
import { sendMessage, ServiceWindowError } from '@/server/messaging/outbound';
import { enqueue } from '@/server/queue/jobs';
import type { WorkspaceContext } from '@/server/db/tenancy';
import { nodeDefinition } from './nodes';
import type { AwaitSpec, NodeResult, NodeRuntime } from './node-types';
import type { FlowVariables } from './template';
import type { FlowRun, FlowVersion } from './types';

/**
 * The flow engine.
 *
 * Executes nodes until the run must stop — parked for a reply, asleep until a
 * time, finished, or out of step budget. Everything it does is recorded in
 * flow_run_steps, which is what makes "why did the bot say that?" answerable.
 */

/** Loop guard. A cycle in the graph would otherwise spin forever. */
const MAX_STEPS_PER_TICK = 50;
/** Total across the run's lifetime, so a long-lived conversation cannot creep. */
const MAX_STEPS_PER_RUN = 500;

export interface ExecutionContext {
  ctx: WorkspaceContext;
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
  recipientExternalId: string;
}

export interface ExecutionOutcome {
  status: FlowRun['status'];
  currentNodeId: string | null;
  stepsTaken: number;
  messagesSent: number;
  error?: string;
}

/** Start a fresh run at the version's entry node. */
export async function startRun(
  execution: ExecutionContext,
  flowId: string,
  version: FlowVersion,
  initialVariables: FlowVariables = {}
): Promise<ExecutionOutcome> {
  const { ctx, conversation } = execution;

  const { data, error } = await ctx.db
    .from('flow_runs')
    .insert({
      workspace_id: ctx.workspaceId,
      conversation_id: conversation.id,
      flow_id: flowId,
      flow_version_id: version.id,
      status: 'running',
      current_node_id: version.entry_node_id,
      variables: initialVariables as Json,
    })
    .select()
    .single();

  if (error || !data) {
    // 23505 means another inbound message already started a run for this
    // conversation — a race, not a failure. Let that run own the conversation.
    if (error?.code === '23505') {
      return { status: 'running', currentNodeId: null, stepsTaken: 0, messagesSent: 0 };
    }
    throw new Error(`Could not start flow run: ${error?.message}`);
  }

  return execute(execution, data as FlowRun, version, null);
}

/** Feed a customer's reply to a parked run and carry on. */
export async function resumeRunWithInput(
  execution: ExecutionContext,
  run: FlowRun,
  version: FlowVersion,
  input: InboundMessage
): Promise<ExecutionOutcome> {
  return execute(execution, run, version, input);
}

/** Wake a sleeping run (delay elapsed). */
export async function resumeSleepingRun(
  execution: ExecutionContext,
  run: FlowRun,
  version: FlowVersion
): Promise<ExecutionOutcome> {
  return execute(execution, run, version, null);
}

async function execute(
  execution: ExecutionContext,
  run: FlowRun,
  version: FlowVersion,
  input: InboundMessage | null
): Promise<ExecutionOutcome> {
  const { ctx } = execution;

  const graph = parseGraph(version);
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  const variables: FlowVariables = { ...((run.variables as FlowVariables) ?? {}) };
  const pendingMessages: OutboundPayload[] = [];
  let messagesSent = 0;
  let stepsTaken = run.steps_taken;

  // Collected by nodes during a step, then flushed together.
  let stepNotes: Record<string, unknown> = {};

  const runtime: NodeRuntime = {
    ctx,
    conversation: execution.conversation,
    contact: execution.contact,
    channel: execution.channel,
    recipientExternalId: execution.recipientExternalId,
    variables,
    setVariable(name, value) {
      variables[name] = value;
    },
    send(payload) {
      pendingMessages.push(payload);
    },
    note(detail) {
      stepNotes = { ...stepNotes, ...detail };
    },
  };

  /** Send everything a node queued, in order. */
  async function flushMessages(): Promise<void> {
    while (pendingMessages.length > 0) {
      const payload = pendingMessages.shift()!;
      await sendMessage(ctx, {
        conversation: execution.conversation,
        channel: execution.channel,
        recipientExternalId: execution.recipientExternalId,
        payload,
        author: 'flow',
      });
      messagesSent += 1;
    }
  }

  /**
   * Step records are buffered and written once at the end.
   *
   * One insert per step meant a five-step run paid five ~265ms round trips
   * before the customer saw a reply. Batched, the whole run costs one.
   */
  const stepBuffer: Array<{
    flow_run_id: string;
    node_id: string;
    node_type: string;
    outcome: string;
    detail: Json;
    duration_ms: number;
  }> = [];

  function recordStep(
    node: FlowNode | null,
    outcome: string,
    detail: Record<string, unknown>,
    durationMs: number
  ): void {
    stepBuffer.push({
      flow_run_id: run.id,
      node_id: node?.id ?? 'unknown',
      node_type: node?.type ?? 'unknown',
      outcome,
      detail: detail as Json,
      duration_ms: durationMs,
    });
  }

  async function flushSteps(): Promise<void> {
    if (stepBuffer.length === 0) return;
    await ctx.table('flow_run_steps').insert(stepBuffer);
    stepBuffer.length = 0;
  }

  let currentNodeId: string | null = run.current_node_id;
  let status: FlowRun['status'] = 'running';
  let resumeAt: Date | null = null;
  let awaiting: AwaitSpec | null = null;
  let failure: string | undefined;
  let stepsThisTick = 0;

  try {
    // A parked run resumes inside the node that parked it, rather than
    // re-entering it and asking the same question again.
    if (input && run.status === 'awaiting_input' && run.awaiting) {
      const spec = run.awaiting as unknown as AwaitSpec;
      const node = nodesById.get(spec.nodeId);
      if (!node) throw new Error(`Parked on node "${spec.nodeId}", which is no longer in the graph.`);

      const definition = nodeDefinition(node.type);
      if (!definition.resume) {
        throw new Error(`Node type "${node.type}" parked for input but cannot resume.`);
      }

      const startedAt = Date.now();
      const config = NODE_CONFIG_SCHEMAS[node.type].parse(node.config);
      const result = await definition.resume(config, runtime, input, spec);
      await flushMessages();
      recordStep(node, 'resumed', { ...stepNotes, result: result.kind }, Date.now() - startedAt);
      stepNotes = {};

      const applied = applyResult(result, node, graph);
      currentNodeId = applied.nextNodeId;
      awaiting = applied.awaiting;
      resumeAt = applied.resumeAt;
      status = applied.status;
    }

    // Main loop: keep entering nodes until something makes us stop.
    while (status === 'running' && currentNodeId) {
      if (stepsThisTick >= MAX_STEPS_PER_TICK) {
        throw new Error(
          `Flow exceeded ${MAX_STEPS_PER_TICK} steps in one go — check for a loop in the graph.`
        );
      }
      if (stepsTaken >= MAX_STEPS_PER_RUN) {
        throw new Error(`Flow exceeded ${MAX_STEPS_PER_RUN} total steps.`);
      }

      const node = nodesById.get(currentNodeId);
      if (!node) throw new Error(`Node "${currentNodeId}" is not in the graph.`);

      const startedAt = Date.now();
      const definition = nodeDefinition(node.type);
      const config = NODE_CONFIG_SCHEMAS[node.type].parse(node.config);

      const result = await definition.enter(config, runtime);
      await flushMessages();

      stepsThisTick += 1;
      stepsTaken += 1;

      const applied = applyResult(result, node, graph);
      recordStep(
        node,
        applied.status === 'running' ? 'advanced' : applied.status,
        { ...stepNotes, handle: applied.handle ?? null },
        Date.now() - startedAt
      );
      stepNotes = {};

      currentNodeId = applied.nextNodeId;
      awaiting = applied.awaiting;
      resumeAt = applied.resumeAt;
      status = applied.status;
    }

    // Ran off the end of the graph without an explicit End node.
    if (status === 'running' && !currentNodeId) status = 'completed';
  } catch (cause) {
    failure = cause instanceof Error ? cause.message : String(cause);
    status = 'failed';

    // A closed service window is a legitimate stop, not a bug in the flow —
    // say so plainly in the inspector so nobody hunts for a broken node.
    const isWindow = cause instanceof ServiceWindowError;
    recordStep(
      currentNodeId ? (nodesById.get(currentNodeId) ?? null) : null,
      'failed',
      { error: failure, serviceWindowClosed: isWindow },
      0
    );
  }

  // These three writes are independent of one another, so they go together
  // rather than costing three sequential round trips.
  await Promise.all([
    ctx
      .table('flow_runs')
      .update({
        status,
        current_node_id: currentNodeId,
        awaiting: (awaiting as unknown as Json) ?? null,
        variables: variables as Json,
        resume_at: resumeAt?.toISOString() ?? null,
        steps_taken: stepsTaken,
        error: failure ?? null,
        ended_at:
          status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
      })
      .eq('id', run.id),

    flushSteps(),

    messagesSent > 0
      ? // Feeds the ROI panel: the "handled without a human" counter.
        ctx.table('events').insert({
          type: 'automation.messages_sent',
          entity_type: 'flow_run',
          entity_id: run.id,
          payload: { count: messagesSent, conversationId: execution.conversation.id } as Json,
        })
      : Promise.resolve(),
  ]);

  // A sleeping run only wakes because a job says so. Enqueued here rather than
  // in the delay node so every path that parks a run schedules its own wake-up.
  if (status === 'sleeping' && resumeAt) {
    await enqueue({
      type: 'flow.resume',
      workspaceId: ctx.workspaceId,
      payload: { flowRunId: run.id },
      runAt: resumeAt,
      dedupeKey: `flow.resume:${run.id}`,
    });
  }

  return { status, currentNodeId, stepsTaken, messagesSent, error: failure };
}

interface AppliedResult {
  nextNodeId: string | null;
  status: FlowRun['status'];
  awaiting: AwaitSpec | null;
  resumeAt: Date | null;
  handle?: string;
}

/** Turn a node's result into the run's next state. */
function applyResult(result: NodeResult, node: FlowNode, graph: FlowGraph): AppliedResult {
  switch (result.kind) {
    case 'advance': {
      const handle = result.handle ?? 'next';
      const target = followEdge(graph, node.id, handle);
      return { nextNodeId: target, status: 'running', awaiting: null, resumeAt: null, handle };
    }
    case 'await':
      return {
        nextNodeId: node.id,
        status: 'awaiting_input',
        // The node does not know its own id, so it is stamped here.
        awaiting: { ...result.awaiting, nodeId: node.id },
        resumeAt: null,
      };
    case 'sleep':
      return {
        nextNodeId: followEdge(graph, node.id, 'next'),
        status: 'sleeping',
        awaiting: null,
        resumeAt: result.resumeAt,
      };
    case 'goto':
      return { nextNodeId: result.nodeId, status: 'running', awaiting: null, resumeAt: null };
    case 'end':
      return { nextNodeId: null, status: 'completed', awaiting: null, resumeAt: null };
  }
}

/**
 * Find where an outlet leads. An unconnected outlet ends the run rather than
 * throwing — validateGraph() already flags these before publishing.
 */
function followEdge(graph: FlowGraph, sourceId: string, handle: string): string | null {
  const exact = graph.edges.find(
    (e) => e.source === sourceId && (e.sourceHandle ?? 'next') === handle
  );
  if (exact) return exact.target;

  // A node with a single unnamed outgoing edge takes it regardless of handle.
  const outgoing = graph.edges.filter((e) => e.source === sourceId);
  if (outgoing.length === 1 && outgoing[0].sourceHandle === undefined) {
    return outgoing[0].target;
  }

  return null;
}

function parseGraph(version: FlowVersion): FlowGraph {
  const parsed = FlowGraphSchema.safeParse(version.graph);
  if (!parsed.success) {
    throw new Error(
      `Flow version ${version.version} has an invalid graph: ${parsed.error.issues[0]?.message}`
    );
  }
  return parsed.data;
}
