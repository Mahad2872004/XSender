'use client';

import { useFormStatus } from 'react-dom';
import styles from './form.module.css';

/**
 * Must be a separate component from the form: useFormStatus reads the status of
 * the nearest parent <form>, so it returns nothing if called in the same
 * component that renders the form.
 */
export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
