import { describe, expect, it } from 'vitest';
import type { FlowGraph } from '@/lib/schemas/flow';
import { restaurantOrderGraph, RESTAURANT_ORDER_ENTRY } from './templates/restaurant-order';
import { FLOW_TEMPLATES, starterTemplatesFor, templatesForVertical } from './templates';
import { validateGraph } from './validate';

function errorsOf(graph: unknown, entry?: string) {
  return validateGraph(graph, entry).issues.filter((i) => i.severity === 'error');
}

describe('shipped templates', () => {
  // Every gallery template must be publishable as-is. A template that fails
  // validation is one a client installs and then cannot use.
  it.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))(
    '%s validates cleanly',
    (_id, template) => {
      const result = validateGraph(template.build('Cafe Delight'), template.entryNodeId);
      expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
      expect(result.valid).toBe(true);
    }
  );

  it('puts the matching vertical first in the gallery', () => {
    const forClinic = templatesForVertical('clinic');
    expect(forClinic[0].verticals).toContain('clinic');
  });

  it('always includes FAQ in the starter set', () => {
    for (const vertical of ['restaurant', 'clinic', 'real_estate', 'ecommerce', 'other'] as const) {
      const starters = starterTemplatesFor(vertical);
      expect(starters.map((t) => t.id)).toContain('faq');
    }
  });

  it('gives a restaurant the order flow as its primary starter', () => {
    expect(starterTemplatesFor('restaurant').map((t) => t.id)).toEqual([
      'restaurant_order',
      'faq',
    ]);
  });
});

describe('validateGraph', () => {
  it('accepts the shipped restaurant template', () => {
    // This is the flagship demo — if it stops validating, the demo is broken.
    const result = validateGraph(restaurantOrderGraph('Cafe Delight'), RESTAURANT_ORDER_ENTRY);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects a graph with no trigger', () => {
    const graph: FlowGraph = {
      nodes: [{ id: 'a', type: 'end', position: { x: 0, y: 0 }, config: {} }],
      edges: [],
    };
    expect(errorsOf(graph)).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('no trigger') })
    );
  });

  it('rejects an edge pointing at a node that does not exist', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'end', type: 'end', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'ghost' }],
    };
    expect(errorsOf(graph, 'trigger')).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('points at a node that does not exist') })
    );
  });

  it('rejects an unconnected branch, which would strand a customer', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'check',
          type: 'condition',
          position: { x: 0, y: 0 },
          config: { variable: 'x', comparator: 'is_set' },
        },
        { id: 'end', type: 'end', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'check' },
        { id: 'e2', source: 'check', sourceHandle: 'true', target: 'end' },
        // 'false' left dangling on purpose.
      ],
    };
    expect(errorsOf(graph, 'trigger')).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('"false"') })
    );
  });

  it('rejects invalid node config', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: {} },
        {
          id: 'ask',
          type: 'ask_question',
          position: { x: 0, y: 0 },
          // saveAs must be a plain identifier; "party size" has a space.
          config: { prompt: 'How many?', saveAs: 'party size', expects: { kind: 'text' } },
        },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'ask' }],
    };
    expect(errorsOf(graph, 'trigger').length).toBeGreaterThan(0);
  });

  it('warns about a node the trigger cannot reach', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, config: {} },
        { id: 'end', type: 'end', position: { x: 0, y: 0 }, config: {} },
        { id: 'orphan', type: 'end', position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'end' }],
    };
    const result = validateGraph(graph, 'trigger');
    expect(result.valid).toBe(true); // a warning, not a blocker
    expect(result.issues).toContainEqual(
      expect.objectContaining({ nodeId: 'orphan', severity: 'warning' })
    );
  });
});
