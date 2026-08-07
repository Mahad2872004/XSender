import type { NodeType } from '@/lib/schemas/flow';
import type { NodeDefinition } from '../node-types';
import { askQuestionNode, sendMessageNode, triggerNode } from './messaging';
import {
  conditionNode,
  delayNode,
  endNode,
  httpRequestNode,
  setVariableNode,
} from './logic';
import { handoffNode, updateContactNode } from './escape';
import {
  cartReviewNode,
  catalogBrowseNode,
  createOrderNode,
  orderStatusNode,
} from './commerce';
import { bookingSlotsNode, createBookingNode } from './booking';

/**
 * Node registry.
 *
 * The canvas renders from this and the executor dispatches through it, so a
 * node cannot exist in one and not the other.
 */
const definitions: NodeDefinition[] = [
  triggerNode,
  sendMessageNode,
  askQuestionNode,
  conditionNode,
  setVariableNode,
  updateContactNode,
  delayNode,
  httpRequestNode,
  catalogBrowseNode,
  cartReviewNode,
  createOrderNode,
  orderStatusNode,
  bookingSlotsNode,
  createBookingNode,
  handoffNode,
  endNode,
];

const byType = new Map<NodeType, NodeDefinition>(definitions.map((d) => [d.type, d]));

export function nodeDefinition(type: NodeType): NodeDefinition {
  const definition = byType.get(type);
  if (!definition) {
    throw new Error(`Unknown node type "${type}".`);
  }
  return definition;
}

export function hasNodeDefinition(type: string): type is NodeType {
  return byType.has(type as NodeType);
}

/** Palette data for the builder. */
export function allNodeDefinitions(): NodeDefinition[] {
  return definitions;
}
