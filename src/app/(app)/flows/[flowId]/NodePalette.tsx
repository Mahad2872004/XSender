'use client';

import type { NodeType } from '@/lib/schemas/flow';
import { NODE_META, PALETTE_ORDER } from './node-meta';
import styles from './builder.module.css';

/**
 * The blocks a flow is built from.
 *
 * Labelled in business language rather than engineering language — "Hand to a
 * human", not "escalation node" — because the person editing this runs a cafe.
 */
export default function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <aside className={styles.palette}>
      <span className={styles.paletteTitle}>Add a step</span>

      <div className={styles.paletteList}>
        {PALETTE_ORDER.map((type) => {
          const meta = NODE_META[type];
          const Icon = meta.icon;

          return (
            <button
              key={type}
              type="button"
              className={`${styles.paletteItem} ${styles[`palette_${meta.tone}`]}`}
              onClick={() => onAdd(type)}
            >
              <Icon size={15} className={styles.paletteIcon} />
              <span className={styles.paletteText}>
                <span className={styles.paletteLabel}>{meta.label}</span>
                <span className={styles.paletteHint}>{meta.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
