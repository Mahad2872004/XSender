'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Building2,
  ShoppingBag,
  Stethoscope,
  UtensilsCrossed,
  Check,
  type LucideIcon,
} from 'lucide-react';
import type { BusinessVertical } from '@/lib/database.types';
import { completeSetup, skipSetup } from './actions';
import { EMPTY_WELCOME_STATE } from './form-state';
import styles from './welcome.module.css';

const VERTICALS: Array<{
  value: BusinessVertical;
  label: string;
  icon: LucideIcon;
  doing: string;
  gets: string;
}> = [
  {
    value: 'restaurant',
    label: 'Restaurant or cafe',
    icon: UtensilsCrossed,
    doing: 'Taking orders and table bookings over chat',
    gets: 'Order flow + FAQ',
  },
  {
    value: 'clinic',
    label: 'Clinic or practice',
    icon: Stethoscope,
    doing: 'Booking and rescheduling appointments by hand',
    gets: 'Booking flow + FAQ',
  },
  {
    value: 'real_estate',
    label: 'Real estate',
    icon: Building2,
    doing: 'Answering the same questions on every enquiry',
    gets: 'Lead capture + FAQ',
  },
  {
    value: 'ecommerce',
    label: 'Online store',
    icon: ShoppingBag,
    doing: '“Is this in stock?” and order status, all day',
    gets: 'Order flow + FAQ',
  },
];

export default function WelcomeForm({ currentVertical }: { currentVertical: BusinessVertical }) {
  const [state, action] = useActionState(completeSetup, EMPTY_WELCOME_STATE);
  const [selected, setSelected] = useState<BusinessVertical>(
    currentVertical === 'other' ? 'restaurant' : currentVertical
  );

  return (
    <form action={action} className={styles.form}>
      {state.error && <p className={styles.error}>{state.error}</p>}

      <input type="hidden" name="vertical" value={selected} />

      <div className={styles.grid}>
        {VERTICALS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
              onClick={() => setSelected(option.value)}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className={styles.check}>
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <Icon size={22} className={styles.optionIcon} />
              <span className={styles.optionLabel}>{option.label}</span>
              <span className={styles.optionDoing}>{option.doing}</span>
              <span className={styles.optionGets}>{option.gets}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        <SetupButton />
        <button type="button" className={styles.skip} onClick={() => void skipSetup()}>
          Skip for now
        </button>
      </div>

      <p className={styles.footnote}>
        Starter flows are added as drafts. Nothing answers a customer until you publish it.
      </p>
    </form>
  );
}

function SetupButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.submit} disabled={pending}>
      {pending ? 'Setting up…' : 'Set up my flows'}
    </button>
  );
}
