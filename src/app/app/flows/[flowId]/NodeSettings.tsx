'use client';

import type { Node } from '@xyflow/react';
import { Trash2, X } from 'lucide-react';
import type { FlowNodeData } from './FlowNodeCard';
import { NODE_META } from './node-meta';
import { NodeConfigForm } from './config-forms';
import styles from './builder.module.css';

/**
 * The right-hand editor for whichever node is selected.
 *
 * Forms are written per node type rather than generated from the zod schemas.
 * A generated form would ask a cafe owner to fill in a discriminated union;
 * a hand-written one asks them to type the message their customer will read.
 */
export default function NodeSettings({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: Node | null;
  onChange: (patch: { label?: string; config?: Record<string, unknown> }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  if (!node) {
    return (
      <aside className={styles.settings}>
        <div className={styles.settingsEmpty}>
          <p className={styles.settingsEmptyTitle}>Nothing selected</p>
          <p className={styles.settingsEmptyBody}>
            Click a step on the canvas to edit what it says and where it goes next.
          </p>
        </div>
      </aside>
    );
  }

  const data = node.data as FlowNodeData;
  const meta = NODE_META[data.nodeType];
  const Icon = meta.icon;
  const isTrigger = data.nodeType === 'trigger';

  return (
    <aside className={styles.settings}>
      <div className={styles.settingsHeader}>
        <div className={styles.settingsTitleRow}>
          <Icon size={15} />
          <span className={styles.settingsTitle}>{meta.label}</span>
        </div>
        <button type="button" className={styles.settingsClose} onClick={onClose} aria-label="Close">
          <X size={17} />
        </button>
      </div>

      <div className={styles.settingsScroll}>
        {data.problem && <p className={styles.settingsProblem}>{data.problem}</p>}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Step name</span>
          <input
            className={styles.input}
            value={data.label ?? ''}
            placeholder={meta.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          <span className={styles.fieldHint}>Only shown to you, on the canvas.</span>
        </label>

        <NodeConfigForm
          type={data.nodeType}
          config={data.config}
          onChange={(config) => onChange({ config })}
        />
      </div>

      {!isTrigger && (
        <div className={styles.settingsFooter}>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            <Trash2 size={14} />
            Delete this step
          </button>
        </div>
      )}
    </aside>
  );
}
