'use client';

import { useActionState } from 'react';
import { createFirstWorkspace } from '../actions';
import { EMPTY_FORM_STATE } from '../form-state';
import { SubmitButton } from '../SubmitButton';
import styles from '../form.module.css';

/**
 * Verticals mirror public.business_vertical. Each one seeds a different set of
 * flow templates in Phase 2 — "Other" starts from a blank canvas.
 */
const VERTICALS = [
  { value: 'restaurant', label: 'Restaurant or cafe' },
  { value: 'clinic', label: 'Medical clinic' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'ecommerce', label: 'E-commerce store' },
  { value: 'other', label: 'Something else' },
] as const;

export default function OnboardingForm() {
  const [state, action] = useActionState(createFirstWorkspace, EMPTY_FORM_STATE);

  return (
    <form action={action} className={styles.form}>
      {state.error && <p className={styles.error}>{state.error}</p>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="businessName">
          Business name
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          className={styles.input}
          placeholder="Cafe Delight"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="vertical">
          What kind of business is it?
        </label>
        <select id="vertical" name="vertical" className={styles.select} defaultValue="restaurant">
          {VERTICALS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton label="Continue" pendingLabel="Setting up…" />
    </form>
  );
}
