import { requireOnboarded } from '@/server/auth/session';
import { loadChecklist } from '@/server/onboarding/checklist';
import SetupClient from './SetupClient';

export const metadata = { title: 'Go-live checklist · xSender' };

/**
 * The pilot go-live checklist.
 *
 * Built for the person setting a client up by hand, which for the first few
 * businesses is us. Self-serve onboarding waits until this has been done enough
 * times to know which steps people actually get stuck on.
 */
export default async function SetupPage() {
  const ctx = await requireOnboarded();
  const checklist = await loadChecklist(ctx);

  return (
    <SetupClient
      checklist={checklist}
      workspaceName={ctx.workspace.name}
      canConfirm={ctx.hasRole('admin')}
    />
  );
}
