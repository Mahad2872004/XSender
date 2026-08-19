import Sidebar from '@/components/Sidebar/Sidebar';
import Topbar from '@/components/Topbar/Topbar';
import { requireUser, requireWorkspace, userWorkspaces } from '@/server/auth/session';
import styles from './layout.module.css';

/**
 * Dashboard shell. Guarding here rather than in each page means no route under
 * (app) can render without a verified user and a workspace they belong to.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await requireWorkspace();
  const memberships = await userWorkspaces();

  const profile = {
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split('@')[0] ??
      'Account',
    email: user.email ?? '',
    role: ctx.role,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };

  return (
    <div className={styles.shell}>
      <Sidebar profile={profile} />
      <div className={styles.main}>
        <Topbar
          workspace={{ id: ctx.workspace.id, name: ctx.workspace.name }}
          workspaces={memberships.map((m) => ({
            id: m.workspace.id,
            name: m.workspace.name,
          }))}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
