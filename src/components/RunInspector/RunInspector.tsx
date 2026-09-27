'use client';

import { CheckCircle2, CircleDashed, Clock, XCircle, PauseCircle } from 'lucide-react';
import type { FlowRunStatus } from '@/lib/database.types';
import styles from './RunInspector.module.css';

export type InspectorRun = {
  id: string;
  status: FlowRunStatus;
  currentNodeId: string | null;
  variables: Record<string, unknown>;
  error: string | null;
};

export type InspectorStep = {
  id: number;
  nodeId: string;
  nodeType: string;
  outcome: string;
  detail: Record<string, unknown>;
  durationMs: number | null;
  createdAt: string;
};

const STATUS_LABEL: Record<FlowRunStatus, string> = {
  running: 'Running',
  awaiting_input: 'Waiting for the customer',
  sleeping: 'Sleeping until a timer fires',
  completed: 'Finished',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

/**
 * Answers "why did the bot say that?".
 *
 * Every node the engine entered, the branch it took, and what it stored — read
 * straight from flow_run_steps. Shared between the Simulator and the Inbox on
 * purpose: when a real customer gets an odd reply, the person looking into it
 * should not have to reproduce it in a test harness first.
 */
export default function RunInspector({
  run,
  steps,
  emptyMessage = 'No flow has run yet. Send a message and every step the engine takes will appear here.',
  flush = false,
}: {
  run: InspectorRun | null;
  steps: InspectorStep[];
  emptyMessage?: string;
  /** Drops the card chrome when the panel fills a column of its own. */
  flush?: boolean;
}) {
  // A closed service window is a rule, not a fault. Called out separately so it
  // never reaches the owner as a bare red "failed".
  const windowClosed = steps.some((step) => step.detail.serviceWindowClosed === true);

  return (
    <aside className={`${styles.inspector} ${flush ? styles.inspectorFlush : ''}`}>
      <div className={styles.inspectorHeader}>
        <h3 className={styles.inspectorTitle}>Run inspector</h3>
        {run && <span className={styles.runStatus}>{STATUS_LABEL[run.status]}</span>}
      </div>

      {!run && <p className={styles.inspectorEmpty}>{emptyMessage}</p>}

      {windowClosed && (
        <div className={styles.inspectorWindow}>
          <strong>The 24-hour window closed.</strong> WhatsApp does not allow a free-form message
          more than 24 hours after the customer&apos;s last one, so the automation could not reply.
          It will pick up again as soon as they write.
        </div>
      )}

      {run?.error && !windowClosed && (
        <div className={styles.inspectorError}>
          <strong>Stopped:</strong> {run.error}
        </div>
      )}

      {run && Object.keys(run.variables).length > 0 && (
        <div className={styles.variables}>
          <span className={styles.sectionLabel}>Collected so far</span>
          <dl className={styles.variableList}>
            {Object.entries(run.variables).map(([key, value]) => (
              <div key={key} className={styles.variableRow}>
                <dt className={styles.variableKey}>{key}</dt>
                <dd className={styles.variableValue}>{format(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <span className={styles.sectionLabel}>Steps</span>
          <ol className={styles.stepList}>
            {steps.map((step) => (
              <li key={step.id} className={styles.step}>
                <span className={styles.stepIcon}>
                  <OutcomeIcon outcome={step.outcome} />
                </span>
                <div className={styles.stepBody}>
                  <span className={styles.stepTitle}>
                    {step.nodeId}
                    <span className={styles.stepType}>{step.nodeType}</span>
                  </span>
                  <span className={styles.stepDetail}>{describe(step)}</span>
                </div>
                {step.durationMs !== null && (
                  <span className={styles.stepDuration}>{step.durationMs}ms</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === 'failed') return <XCircle size={15} className={styles.iconError} />;
  if (outcome === 'awaiting_input') return <PauseCircle size={15} className={styles.iconWait} />;
  if (outcome === 'sleeping') return <Clock size={15} className={styles.iconWait} />;
  if (outcome === 'completed') return <CheckCircle2 size={15} className={styles.iconOk} />;
  return <CircleDashed size={15} className={styles.iconMuted} />;
}

/** Turn a step's detail bag into one readable line. */
export function describe(step: InspectorStep): string {
  const { detail, outcome } = step;

  // Checked before `detail.error`: the executor writes both on a window failure,
  // and the raw Graph message is the less useful of the two.
  if (detail.serviceWindowClosed === true) {
    return 'The 24-hour service window has closed — only a template can be sent.';
  }

  if (typeof detail.error === 'string') return detail.error;

  if (typeof detail.invalidAnswer === 'string') {
    return `Did not understand "${detail.invalidAnswer}" (attempt ${format(detail.attempts)})`;
  }

  if (typeof detail.handle === 'string' && detail.handle) {
    return `took the "${detail.handle}" branch`;
  }

  if (typeof detail.result === 'string') return `resumed → ${detail.result}`;

  if (Array.isArray(detail.updated) && detail.updated.length > 0) {
    return `updated ${detail.updated.join(', ')}`;
  }

  if (typeof detail.variable === 'string') {
    return `${detail.variable} = ${format(detail.actual)} → ${format(detail.result)}`;
  }

  return outcome;
}

function format(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
