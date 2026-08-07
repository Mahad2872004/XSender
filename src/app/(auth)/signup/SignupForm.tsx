'use client';

import { useActionState } from 'react';
import { signUp } from '../actions';
import { EMPTY_FORM_STATE } from '../form-state';
import { SubmitButton } from '../SubmitButton';
import styles from '../form.module.css';

export default function SignupForm() {
  const [state, action] = useActionState(signUp, EMPTY_FORM_STATE);

  return (
    <form action={action} className={styles.form}>
      {state.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="fullName">
          Your name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          className={styles.input}
          placeholder="Misbah Adil"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="businessName">
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          autoComplete="organization"
          required
          className={styles.input}
          placeholder="Cafe Delight"
        />
        <span className={styles.hint}>This becomes your workspace name.</span>
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className={styles.input}
          placeholder="At least 8 characters"
        />
      </div>

      <SubmitButton label="Create workspace" pendingLabel="Creating…" />
    </form>
  );
}
