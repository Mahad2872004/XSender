'use client';

import { useActionState } from 'react';
import { signIn } from '../actions';
import { EMPTY_FORM_STATE } from '../form-state';
import { SubmitButton } from '../SubmitButton';
import styles from '../form.module.css';

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, EMPTY_FORM_STATE);

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="next" value={next} />

      {state.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={styles.input}
          placeholder="you@business.com"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={styles.input}
          placeholder="••••••••"
        />
      </div>

      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
