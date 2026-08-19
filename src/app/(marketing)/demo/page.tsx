import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import LiveDemo from '../LiveDemo';
import shared from '../marketing.module.css';
import styles from './demo.module.css';

export const metadata: Metadata = {
  title: 'See it work',
  description:
    'Watch xSender take a real order on WhatsApp — menu, cart, delivery, confirmation — with nobody from the business involved.',
  alternates: { canonical: PUBLIC.demo },
};

export default function DemoPage() {
  return (
    <>
      <section className={shared.section}>
        <div className={shared.container}>
          <div className={styles.layout}>
            <div>
              <span className={shared.eyebrow}>See it work</span>
              <h1 className={shared.sectionTitle}>
                Order something. Nobody from the business is involved.
              </h1>
              <p className={shared.sectionLead}>
                This is the same engine our customers run on WhatsApp — not a recording
                and not a mock. Order something and it writes a real record. Go
                off-script and watch it hand you to a person rather than guess.
              </p>

              <ul className={styles.beats}>
                <li className={styles.beat}>
                  <strong>It answers the question first.</strong> “Are you open?” gets a
                  real answer, not a holding message.
                </li>
                <li className={styles.beat}>
                  <strong>It reads your live menu.</strong> Prices and availability come
                  from what you set, so a sold-out dish is never offered.
                </li>
                <li className={styles.beat}>
                  <strong>It creates a record.</strong> Order XS-1042 is a row your kitchen
                  can act on, not a message someone has to retype.
                </li>
                <li className={styles.beat}>
                  <strong>It hands over when it should.</strong> Ask for something it was
                  not built for and a person gets the whole thread.
                </li>
              </ul>

              <div className={shared.heroCtas}>
                <Link href={PUBLIC.signup} className={shared.ctaPrimary} data-cta="demo-signup">
                  Try it with your own menu
                  <ArrowRight size={18} />
                </Link>
              </div>

              <p className={styles.note}>
                <Info size={15} className={styles.noteIcon} />
                <span>
                  This runs on a shared demo restaurant, so the menu is ours rather than
                  yours. Everything else — the engine, the availability checks, the order
                  it writes — is exactly what a paying customer runs.
                </span>
              </p>
            </div>

            <div className={styles.phoneColumn}>
              <LiveDemo />
            </div>
          </div>
        </div>
      </section>

      <section className={shared.sectionDark}>
        <div className={`${shared.container} ${shared.finalCta}`}>
          <h2 className={shared.finalCtaTitle}>Now do it with your own prices</h2>
          <p className={shared.finalCtaLead}>
            Free account, your real menu, a simulated customer to test against. No card and
            no channel connection needed to try it.
          </p>
          <div className={shared.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={shared.ctaPrimary} data-cta="demo-final">
              Start free
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.setupService} className={shared.ctaSecondary}>
              Have us set it up
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
