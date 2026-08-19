'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import type { NodeType } from '@/lib/schemas/flow';
import { NODE_META, summarise } from './node-meta';
import styles from './builder.module.css';

export interface FlowNodeData extends Record<string, unknown> {
  nodeType: NodeType;
  label?: string;
  config: Record<string, unknown>;
  /** Outgoing branches; one source handle is rendered per entry. */
  outlets: string[];
  /** Set when validation found a problem with this node. */
  problem?: string;
}

/**
 * A node on the canvas.
 *
 * Every outlet gets its own labelled source handle, so a question with three
 * buttons visibly has three exits plus a fallback — the branching is the thing
 * a non-technical user needs to see, not something hidden in a settings panel.
 */
function FlowNodeCardImpl({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const meta = NODE_META[nodeData.nodeType];
  const Icon = meta.icon;
  const summary = summarise(nodeData.nodeType, nodeData.config);

  const isTrigger = nodeData.nodeType === 'trigger';
  const outlets = nodeData.outlets;

  return (
    <div
      className={[
        styles.node,
        styles[`tone_${meta.tone}`],
        selected ? styles.nodeSelected : '',
        nodeData.problem ? styles.nodeProblem : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Triggers start the flow, so they take no input. */}
      {!isTrigger && (
        <Handle type="target" position={Position.Left} className={styles.handleTarget} />
      )}

      <div className={styles.nodeHeader}>
        <Icon size={13} />
        <span className={styles.nodeType}>{meta.label}</span>
        {nodeData.problem && (
          <AlertTriangle size={13} className={styles.nodeWarnIcon} aria-label={nodeData.problem} />
        )}
      </div>

      <div className={styles.nodeBody}>
        {nodeData.label && <span className={styles.nodeLabel}>{nodeData.label}</span>}
        {summary && <span className={styles.nodeSummary}>{summary}</span>}
      </div>

      {outlets.length > 0 && (
        <div className={styles.outlets}>
          {outlets.map((outlet, index) => (
            <div key={outlet} className={styles.outletRow}>
              <span
                className={outlet === 'fallback' ? styles.outletLabelMuted : styles.outletLabel}
              >
                {outlet === 'next' ? '' : outlet}
              </span>
              <Handle
                id={outlet}
                type="source"
                position={Position.Right}
                className={styles.handleSource}
                style={{
                  // Stack handles down the right edge, aligned to their labels.
                  top: `${NODE_HEADER_HEIGHT + index * OUTLET_ROW_HEIGHT + OUTLET_ROW_HEIGHT / 2}px`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Must match .nodeHeader + .nodeBody height in builder.module.css. */
const NODE_HEADER_HEIGHT = 62;
const OUTLET_ROW_HEIGHT = 22;

export const FlowNodeCard = memo(FlowNodeCardImpl);
