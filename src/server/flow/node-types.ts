import type { z } from 'zod';
import type { Channel, Contact, Conversation } from '@/lib/database.types';
import type { InboundMessage } from '@/server/channels/types';
import type { OutboundPayload } from '@/lib/schemas/message';
import type { NodeType } from '@/lib/schemas/flow';
import type { WorkspaceContext } from '@/server/db/tenancy';
import type { FlowVariables } from './template';

/**
 * The contract every node implements.
 *
 * A node does one of five things when control reaches it: move on, park for a
 * customer reply, park until a time, jump elsewhere, or end the run. Keeping
 * that set small is what makes the executor a readable loop rather than a
 * tangle of special cases.
 */

export interface NodeRuntime {
  ctx: WorkspaceContext;
  conversation: Conversation;
  contact: Contact;
  channel: Channel;
  /** Platform id to reply to. */
  recipientExternalId: string;

  variables: FlowVariables;
  /** Merged into flow_run.variables when the step commits. */
  setVariable(name: string, value: unknown): void;

  /** Queue a message; the executor sends it as part of the step. */
  send(payload: OutboundPayload): void;

  /** Extra detail for the run inspector. */
  note(detail: Record<string, unknown>): void;
}

export type NodeResult =
  /** Follow the edge leaving `handle` (or the default outlet). */
  | { kind: 'advance'; handle?: string }
  /** Park until the customer replies. */
  | { kind: 'await'; awaiting: AwaitSpec }
  /** Park until `resumeAt`; the worker wakes the run. */
  | { kind: 'sleep'; resumeAt: Date }
  /** Jump to a specific node — used for question retries. */
  | { kind: 'goto'; nodeId: string }
  /** Terminate the run. */
  | { kind: 'end'; reason?: string };

/** What a parked node is waiting for. Persisted in flow_runs.awaiting. */
export interface AwaitSpec {
  nodeId: string;
  /** Matches AskQuestionConfig.expects.kind. */
  kind: string;
  /** Selectable options, when the question offered any. */
  options?: Array<{ id: string; title: string }>;
  /** Invalid answers so far, against maxAttempts. */
  attempts: number;
}

export interface NodeDefinition<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  type: NodeType;
  configSchema: Schema;
  category: 'trigger' | 'message' | 'logic' | 'domain' | 'escape';
  label: string;
  description: string;

  /** Runs when control arrives at the node. */
  enter(config: z.infer<Schema>, runtime: NodeRuntime): Promise<NodeResult>;

  /**
   * Runs when a parked node receives the customer's reply. Only nodes that
   * return `await` need this.
   */
  resume?(
    config: z.infer<Schema>,
    runtime: NodeRuntime,
    input: InboundMessage,
    awaiting: AwaitSpec
  ): Promise<NodeResult>;
}
