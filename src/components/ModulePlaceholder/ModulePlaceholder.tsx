import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import styles from './ModulePlaceholder.module.css';

/**
 * Honest stand-in for a module that is planned but not built yet.
 *
 * Deliberately not a fake dashboard: showing invented numbers here would make
 * the product feel finished when it isn't, and this screen is one a prospect
 * might see during a demo. It says what the module will do and when it lands.
 */
export default function ModulePlaceholder({
  icon: Icon,
  title,
  phase,
  summary,
  capabilities,
  action,
}: {
  icon: LucideIcon;
  title: string;
  /** Roadmap phase this ships in, e.g. "Phase 3". */
  phase: string;
  summary: string;
  capabilities: string[];
  action?: { label: string; href: string };
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Icon size={26} />
        </div>

        <span className={styles.phase}>{phase}</span>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.summary}>{summary}</p>

        <ul className={styles.list}>
          {capabilities.map((capability) => (
            <li key={capability} className={styles.listItem}>
              {capability}
            </li>
          ))}
        </ul>

        {action && (
          <Link href={action.href} className={styles.action}>
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
