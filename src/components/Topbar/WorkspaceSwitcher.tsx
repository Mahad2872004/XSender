'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { switchWorkspace } from '@/app/(auth)/actions';
import styles from './WorkspaceSwitcher.module.css';

export type WorkspaceOption = { id: string; name: string };

export default function WorkspaceSwitcher({
  active,
  options,
}: {
  active: WorkspaceOption;
  options: WorkspaceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape, so the menu never strands the user.
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

  function choose(id: string) {
    setOpen(false);
    if (id === active.id) return;
    startTransition(() => {
      void switchWorkspace(id);
    });
  }

  // With a single workspace there is nothing to switch to, so render a label.
  if (options.length <= 1) {
    return (
      <div className={styles.static}>
        <Building2 size={15} className={styles.icon} />
        <span className={styles.name}>{active.name}</span>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Building2 size={15} className={styles.icon} />
        <span className={styles.name}>{active.name}</span>
        <ChevronDown size={14} className={styles.chevron} />
      </button>

      {open && (
        <ul className={styles.menu} role="listbox">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === active.id}
                className={styles.menuItem}
                onClick={() => choose(option.id)}
              >
                <span className={styles.menuLabel}>{option.name}</span>
                {option.id === active.id && <Check size={14} className={styles.check} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
