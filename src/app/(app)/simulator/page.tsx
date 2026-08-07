import { requireWorkspace } from '@/server/auth/session';
import { loadSimulatorState } from '@/server/simulator/service';
import { MessagePayloadSchema, type MessagePayload } from '@/lib/schemas/message';
import SimulatorClient, { type SimulatorMessage } from './SimulatorClient';

export const metadata = { title: 'Simulator · xSender' };

/**
 * Runs the real engine against a fake customer.
 *
 * Everything here goes through the same inbound pipeline, router, and executor
 * that WhatsApp will in Phase 4 — so a flow debugged here is a flow that works.
 */
export default async function SimulatorPage() {
  const ctx = await requireWorkspace();
  const state = await loadSimulatorState(ctx);

  const { data: publishedFlows } = await ctx
    .table('flows')
    .select<{ id: string; name: string }>('id, name')
    .eq('status', 'published')
    .limit(10);

  const messages: SimulatorMessage[] = state.messages.map((message) => {
    // A payload that fails to parse is shown as-is rather than crashing the
    // page — this screen is where you debug bad data, not where you hide it.
    const parsed = MessagePayloadSchema.safeParse(message.payload);
    const payload: MessagePayload = parsed.success
      ? parsed.data
      : { type: 'unsupported', raw: JSON.stringify(message.payload).slice(0, 200) };

    return {
      id: message.id,
      direction: message.direction,
      author: message.author,
      status: message.status,
      createdAt: message.created_at,
      payload,
      error: message.error,
    };
  });

  return (
    <SimulatorClient
      workspaceName={ctx.workspace.name}
      messages={messages}
      hasPublishedFlow={(publishedFlows ?? []).length > 0}
      run={
        state.run
          ? {
              id: state.run.id,
              status: state.run.status,
              currentNodeId: state.run.current_node_id,
              variables: (state.run.variables ?? {}) as Record<string, unknown>,
              error: state.run.error,
            }
          : null
      }
      steps={state.steps.map((step) => ({
        id: step.id,
        nodeId: step.node_id,
        nodeType: step.node_type,
        outcome: step.outcome,
        detail: (step.detail ?? {}) as Record<string, unknown>,
        durationMs: step.duration_ms,
        createdAt: step.created_at,
      }))}
    />
  );
}
