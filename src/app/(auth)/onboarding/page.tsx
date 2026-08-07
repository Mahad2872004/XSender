import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { listWorkspacesForUser } from '@/server/db/tenancy';
import OnboardingForm from './OnboardingForm';
import styles from '../form.module.css';

export const metadata = { title: 'Set up your workspace · xSender' };

/**
 * Reached when someone is signed in but has no workspace — typically after
 * confirming their email, since signup could not create one without a session.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  const memberships = await listWorkspacesForUser(user.id);

  if (memberships.length > 0) redirect('/');

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Tell us about your business</h1>
        <p className={styles.subtitle}>
          We use this to pick the right automation templates for you. You can change it
          later.
        </p>
      </div>

      <OnboardingForm />
    </>
  );
}
