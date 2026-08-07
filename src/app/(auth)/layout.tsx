import { Send, Check } from 'lucide-react';
import styles from './layout.module.css';

/**
 * Shell for the signed-out screens and first-run onboarding: no sidebar, no
 * topbar. The left panel carries the pitch, because the first thing a prospect
 * sees should be the ROI story, not a bare form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.brand}>
        <div className={styles.brandLogo}>
          <Send size={26} />
          <span>xSender</span>
        </div>

        <div>
          <h1 className={styles.brandHeadline}>
            Stop paying people to answer the same messages.
          </h1>
          <p className={styles.brandSub}>
            Your team answers &ldquo;is this in stock?&rdquo;, takes orders, and confirms
            bookings by hand on WhatsApp, Instagram, and Facebook. xSender does that
            automatically, and hands over to a human only when it needs to.
          </p>

          <div className={styles.brandPoints}>
            <div className={styles.brandPoint}>
              <Check className={styles.brandPointIcon} size={16} />
              <span>One inbox for WhatsApp, Instagram DMs, and Messenger</span>
            </div>
            <div className={styles.brandPoint}>
              <Check className={styles.brandPointIcon} size={16} />
              <span>Orders and bookings captured straight from chat</span>
            </div>
            <div className={styles.brandPoint}>
              <Check className={styles.brandPointIcon} size={16} />
              <span>Status updates and reminders that send themselves</span>
            </div>
          </div>
        </div>

        <p className={styles.brandFooter}>Promptly · xSender</p>
      </aside>

      <main className={styles.panel}>
        <div className={styles.card}>{children}</div>
      </main>
    </div>
  );
}
