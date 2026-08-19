import { APP } from '@/lib/routes';
import { redirect } from 'next/navigation';
import { requireWorkspace } from '@/server/auth/session';
import WelcomeForm from './WelcomeForm';
import styles from './welcome.module.css';

export const metadata = { title: 'Set up · xSender' };

export default async function WelcomePage() {
  const ctx = await requireWorkspace();

  // Onboarding runs once; returning here later just goes to the dashboard.
  if (ctx.workspace.onboarded_at) redirect(APP.dashboard);

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>What kind of business is {ctx.workspace.name}?</h1>
        <p className={styles.subtitle}>
          Every vertical needs the same four things — answer questions, take the order or
          booking, send updates, and pass anything unusual to a person. We use your answer
          to set up the right starting flows. You can change it later.
        </p>
      </div>

      <WelcomeForm currentVertical={ctx.workspace.vertical} />
    </div>
  );
}
