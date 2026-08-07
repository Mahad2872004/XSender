import {
  FlowGraphSchema,
  NODE_CONFIG_SCHEMAS,
  outletsFor,
  type FlowGraph,
  type FlowNode,
} from '@/lib/schemas/flow';
import { hasNodeDefinition } from './nodes';

/**
 * Static checks on a flow graph.
 *
 * Run before publishing so the business owner sees "this button goes nowhere"
 * in the builder, rather than a customer hitting a dead end at 9pm.
 */

export interface ValidationIssue {
  severity: 'error' | 'warning';
  nodeId?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  graph?: FlowGraph;
}

export function validateGraph(raw: unknown, entryNodeId?: string): ValidationResult {
  const parsed = FlowGraphSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((i) => ({
        severity: 'error',
        message: `${i.path.join('.') || 'graph'}: ${i.message}`,
      })),
    };
  }

  const graph = parsed.data;
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  if (nodeIds.size !== graph.nodes.length) {
    issues.push({ severity: 'error', message: 'Two nodes share the same id.' });
  }

  for (const node of graph.nodes) {
    validateNodeConfig(node, issues);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({ severity: 'error', message: `Edge ${edge.id} starts from a node that does not exist.` });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({ severity: 'error', message: `Edge ${edge.id} points at a node that does not exist.` });
    }
  }

  // Entry node
  const entry = entryNodeId ?? graph.nodes.find((n) => n.type === 'trigger')?.id;
  if (!entry) {
    issues.push({ severity: 'error', message: 'The flow has no trigger to start from.' });
  } else if (!nodeIds.has(entry)) {
    issues.push({ severity: 'error', message: `Entry node "${entry}" is not in the graph.` });
  }

  // Unreachable nodes — usually a leftover from editing, harmless but worth saying.
  if (entry && nodeIds.has(entry)) {
    const reachable = reachableFrom(graph, entry);
    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `"${node.label ?? node.type}" cannot be reached from the trigger.`,
        });
      }
    }
  }

  // Dead ends: an outlet with no edge leaves the customer with no reply.
  for (const node of graph.nodes) {
    const outlets = outletsFor(node);
    if (outlets.length === 0) continue;

    const connected = new Set(
      graph.edges
        .filter((e) => e.source === node.id)
        .map((e) => e.sourceHandle ?? 'next')
    );

    for (const outlet of outlets) {
      if (!connected.has(outlet)) {
        issues.push({
          severity: outlet === 'fallback' ? 'warning' : 'error',
          nodeId: node.id,
          message: `"${node.label ?? node.type}" has nothing connected to its "${outlet}" outlet.`,
        });
      }
    }
  }

  const valid = !issues.some((i) => i.severity === 'error');
  return { valid, issues, graph: valid ? graph : undefined };
}

function validateNodeConfig(node: FlowNode, issues: ValidationIssue[]): void {
  if (!hasNodeDefinition(node.type)) {
    issues.push({
      severity: 'error',
      nodeId: node.id,
      message: `Node type "${node.type}" is not available.`,
    });
    return;
  }

  const schema = NODE_CONFIG_SCHEMAS[node.type];
  const result = schema.safeParse(node.config);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        message: `"${node.label ?? node.type}" — ${issue.path.join('.') || 'config'}: ${issue.message}`,
      });
    }
  }
}

function reachableFrom(graph: FlowGraph, entry: string): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const seen = new Set<string>([entry]);
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }

  return seen;
}
