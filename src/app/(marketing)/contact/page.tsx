import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import shared from '../marketing.module.css';
import styles from './contact.module.css';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Talk to the people who build xSender. Book a discovery call for done-for-you setup, or just ask a question.',
  alternates: { canonical: PUBLIC.contact },
};

export default function ContactPage() {
  return (
    <section className={shared.section}>
      <div className={shared.container}>
        <div className={shared.narrow}>
          <span className={shared.eyebrow}>Contact</span>
          <h1 className={shared.sectionTitle}>Talk to a person who built it</h1>
          <p className={shared.sectionLead}>
            No sales floor, no call centre. Tell us what your business does by hand and we
            will tell you honestly whether xSender helps.
          </p>

          <div className={styles.cards}>
            <a href="mailto:hello@promptly.pk" className={styles.contactCard}>
              <Mail size={22} className={styles.contactIcon} />
              <div>
                <h2 className={styles.contactTitle}>Email us</h2>
                <p className={styles.contactBody}>
                  hello@promptly.pk — usually answered the same day.
                </p>
              </div>
            </a>

            <Link href={PUBLIC.setupService} className={styles.contactCard}>
              <MessageSquare size={22} className={styles.contactIcon} />
              <div>
                <h2 className={styles.contactTitle}>Done-for-you setup</h2>
                <p className={styles.contactBody}>
                  Thirty minutes to understand your business, seven days to live.
                </p>
              </div>
            </Link>
          </div>

          <p className={styles.footnote}>
            Already using xSender? Sign in and use the help link in the dashboard — we can
            see your workspace and answer faster.
          </p>
        </div>
      </div>
    </section>
  );
}
