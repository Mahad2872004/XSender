'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CircleDashed, Lock, PartyPopper } from 'lucide-react';
import type { Checklist, ChecklistStep } from '@/server/onboarding/checklist';
import { toggleConfirmation } from './actions';
import styles from './setup.module.css';

/**
 * Go-live checklist.
 *
 * Reads top to bottom as a sequence, because that is how it gets done. Derived
 * items show what they found rather than a bare tick — "first signed delivery
 * 2026-09-14" is the sort of thing you can act on; a green circle is not.
 */
export default function SetupClient({
  checklist,
  workspaceName,
  canConfirm,
}: {
  checklist: Checklist;
  workspaceName: string;
  canConfirm: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const total = checklist.steps.length;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Getting {workspaceName} live</h1>
          <p className={styles.sub}>
            Nine steps from an empty account to a real customer being answered automatically. All
            but two are worked out from your data — they turn green when they are actually true, not
            when someone remembers to tick them.
          </p>
        </div>
        <div className={styles.progress}>
          <span className={styles.progressCount}>
            {checklist.doneCount}
            <span className={styles.progressOf}>/{total}</span>
          </span>
          <span className={styles.progressLabel}>done</span>
        </div>
      </header>

      {checklist.isLive && (
        <div className={styles.liveBanner}>
          <PartyPopper size={17} />
          <div>
            <strong>This account is live.</strong> A real customer has been answered automatically,
            so the hours-saved figure on the dashboard is now counting real work.
          </div>
        </div>
      )}

      <ol className={styles.steps}>
        {checklist.steps.map((step, index) => (
          <Step
            key={step.id}
            step={step}
            index={index + 1}
            canConfirm={canConfirm}
            pending={pending}
            onToggle={(done) =>
              startTransition(() => void toggleConfirmation(step.id === 'walkthrough' ? 'ownerWalkthroughAt' : 'feedbackCallAt', done))
            }
          />
        ))}
      </ol>

      <p className={styles.foot}>
        Instagram and Facebook Messenger, self-serve signup and billing are all deliberately absent.
        They come after a handful of these accounts are live, retained, and telling us what is
        missing.
      </p>
    </div>
  );
}

function Step({
  step,
  index,
  canConfirm,
  pending,
  onToggle,
}: {
  step: ChecklistStep;
  index: number;
  canConfirm: boolean;
  pending: boolean;
  onToggle: (done: boolean) => void;
}) {
  const done = step.state === 'done';
  const blocked = step.state === 'blocked';

  return (
    <li
      className={[
        styles.step,
        done ? styles.stepDone : '',
        blocked ? styles.stepBlocked : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.marker} aria-hidden>
        {done ? <Check size={15} /> : blocked ? <Lock size={13} /> : <CircleDashed size={15} />}
      </span>

      <div className={styles.body}>
        <div className={styles.stepHead}>
          <h2 className={styles.stepTitle}>
            <span className={styles.stepIndex}>{index}.</span>
            {step.title}
          </h2>
          {step.manual && <span className={styles.manualTag}>confirm by hand</span>}
        </div>

        <p className={styles.stepBody}>{step.body}</p>

        {step.evidence && (
          <p className={styles.evidence}>
            <Check size={12} />
            {step.evidence}
          </p>
        )}

        {step.blockedBy && <p className={styles.blockedBy}>{step.blockedBy}</p>}

        <div className={styles.stepActions}>
          {step.action && !done && !blocked && (
            <Link href={step.action.href} className={styles.stepLink}>
              {step.action.label}
              <ArrowRight size={13} />
            </Link>
          )}

          {step.manual && canConfirm && (
            <button
              type="button"
              className={done ? styles.undoBtn : styles.confirmBtn}
              disabled={pending}
              onClick={() => onToggle(!done)}
            >
              {done ? 'Undo' : 'Mark as done'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
