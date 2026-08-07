'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '@/app/(auth)/actions';
import type { WorkspaceRole } from '@/lib/database.types';
import styles from './Sidebar.module.css';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Agent',
  viewer: 'Viewer',
};

export type SidebarProfile = {
  name: string;
  email: string;
  role: WorkspaceRole;
  avatarUrl: string | null;
};

export default function UserMenu({ profile }: { profile: SidebarProfile }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.userMenuWrapper} ref={containerRef}>
      {open && (
        <div className={styles.userMenu}>
          <div className={styles.userMenuHeader}>
            <span className={styles.userMenuName}>{profile.name}</span>
            <span className={styles.userMenuEmail}>{profile.email}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className={styles.userMenuItem}>
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={styles.userProfile}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar host is user-supplied
          <img src={profile.avatarUrl} alt="" className={styles.userAvatar} />
        ) : (
          <div className={styles.userAvatarFallback} aria-hidden="true">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={styles.userInfo}>
          <span className={styles.userName}>{profile.name}</span>
          <span className={styles.userRole}>{ROLE_LABEL[profile.role]}</span>
        </div>
      </button>
    </div>
  );
}
