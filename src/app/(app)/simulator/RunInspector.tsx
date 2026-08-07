'use client';

import { CheckCircle2, CircleDashed, Clock, XCircle, PauseCircle } from 'lucide-react';
import type { FlowRunStatus } from '@/lib/database.types';
import styles from './simulator.module.css';

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
 * straight from flow_run_steps. Without this, debugging a live flow is
 * guesswork.
 */
export default function RunInspector({
  run,
  steps,
}: {
  run: InspectorRun | null;
  steps: InspectorStep[];
}) {
  return (
    <aside className={styles.inspector}>
      <div className={styles.inspectorHeader}>
        <h3 className={styles.inspectorTitle}>Run inspector</h3>
        {run && <span className={styles.runStatus}>{STATUS_LABEL[run.status]}</span>}
      </div>

      {!run && (
        <p className={styles.inspectorEmpty}>
          No flow has run yet. Send a message and every step the engine takes will appear
          here.
        </p>
      )}

      {run?.error && (
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
        <div className={styles.steps}>
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
function describe(step: InspectorStep): string {
  const { detail, outcome } = step;

  if (typeof detail.error === 'string') return detail.error;

  if (detail.serviceWindowClosed === true) {
    return 'The 24-hour service window has closed — only a template can be sent.';
  }

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
