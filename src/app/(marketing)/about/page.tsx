import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import shared from '../marketing.module.css';
import styles from './about.module.css';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why we built xSender: too many good businesses lose customers because nobody was free to reply. Built by Promptly.',
  alternates: { canonical: PUBLIC.about },
};

export default function AboutPage() {
  return (
    <>
      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.narrow}>
            <span className={shared.eyebrow}>About</span>
            {/* Opens on the customer's transformation, not our CV. */}
            <h1 className={shared.sectionTitle}>
              Good businesses lose customers for the dullest possible reason: nobody was
              free to reply.
            </h1>

            <div className={styles.prose}>
              <p>
                Walk into almost any cafe, clinic or salon and you will find someone
                holding a phone, typing the same answer they typed twenty minutes ago.
                Meanwhile three more messages arrive, and one of them was a customer who
                will now order somewhere else.
              </p>
              <p>
                That is not a technology problem. It is a staffing problem that technology
                created — chat became the way people buy, and nobody staffed for it.
              </p>
              <p>
                We built xSender because the work is genuinely repetitive. Not
                <em> complicated</em>: repetitive. The same four questions, the same order,
                the same “where is it”. Software has been able to do that for years; what
                was missing was something a restaurant owner could set up without hiring a
                developer.
              </p>

              <h2 className={styles.h2}>What we believe</h2>

              <p>
                <strong>Automation should never trap a customer.</strong> Every
                conversation keeps a route to a human, and xSender refuses to publish a
                flow with a dead end. A bot that corners someone is worse than no bot.
              </p>
              <p>
                <strong>You should not pay a markup on your own messages.</strong> You
                connect your own Meta account and pay Meta directly. We sell software, not
                resold messaging.
              </p>
              <p>
                <strong>It should sound like you.</strong> Nothing here guesses what to
                say. You write the words; the software just says them faster than a person
                can type.
              </p>

              <h2 className={styles.h2}>Who is behind it</h2>

              <p>
                xSender is built by <strong>Promptly</strong>, a small team that ships in
                public. There is no sales floor and no call centre — if you email us, one
                of the people who wrote the code replies.
              </p>
              <p>
                We are early, and we would rather say so than pretend otherwise. If you
                are one of our first customers you will get more of our attention than you
                would from anyone larger, and your feedback will visibly change the
                product.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.sectionDark}>
        <div className={`${shared.container} ${shared.finalCta}`}>
          <h2 className={shared.finalCtaTitle}>Come and try it</h2>
          <p className={shared.finalCtaLead}>
            Free to set up. If it does not fit your business, tell us why — that is
            genuinely useful to us right now.
          </p>
          <div className={shared.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={shared.ctaPrimary} data-cta="about-final">
              Start free
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.contact} className={shared.ctaSecondary}>
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
