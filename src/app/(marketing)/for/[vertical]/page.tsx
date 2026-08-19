import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import { marketingVerticals, verticalBySlug } from '@/lib/verticals';
import styles from '../../marketing.module.css';

/**
 * Vertical landing pages — the SEO workhorse.
 *
 * Generated from the taxonomy in src/lib/verticals.ts, so adding a market is a
 * data change rather than a new file. Statically rendered at build time.
 */

export function generateStaticParams() {
  return marketingVerticals().map((v) => ({ vertical: v.slug }));
}

export async function generateMetadata(
  props: PageProps<'/for/[vertical]'>
): Promise<Metadata> {
  const { vertical: slug } = await props.params;
  const vertical = verticalBySlug(slug);
  if (!vertical) return {};

  const title = `WhatsApp automation for ${vertical.plural.toLowerCase()}`;
  const description = `${vertical.doingByHand}. xSender handles it automatically on WhatsApp, Instagram and Messenger — and hands over to your team when it should.`;

  return {
    title,
    description,
    alternates: { canonical: PUBLIC.vertical(slug) },
    openGraph: { title, description },
  };
}

const JOB_COPY = {
  orders: {
    headline: 'take the order',
    detail:
      'Customers browse your real list, choose, and confirm — and it arrives as an order your team can act on, not a message someone has to read and retype.',
  },
  bookings: {
    headline: 'book the appointment',
    detail:
      'It offers only the times you genuinely have free, takes the booking, and never double-books — because availability is checked against your real calendar, not guessed.',
  },
  leads: {
    headline: 'qualify the enquiry',
    detail:
      'It asks the questions you always ask, saves the answers to the customer’s record, and passes the serious ones straight to you with everything already filled in.',
  },
  answers: {
    headline: 'answer instantly',
    detail:
      'The questions you answer twenty times a day get answered in seconds, at any hour, in your own words.',
  },
} as const;

export default async function VerticalPage(props: PageProps<'/for/[vertical]'>) {
  const { vertical: slug } = await props.params;
  const vertical = verticalBySlug(slug);
  if (!vertical) notFound();

  const job = JOB_COPY[vertical.primaryJob];
  const others = marketingVerticals().filter((v) => v.slug !== slug);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>
              For {vertical.plural.toLowerCase()}
            </span>
            <h1 className={styles.heroTitle}>
              Stop {vertical.doingByHand.charAt(0).toLowerCase() + vertical.doingByHand.slice(1)}
            </h1>
            <p className={styles.heroLead}>
              xSender replies on WhatsApp, Instagram and Facebook the way your team would,
              and can {job.headline} without anyone lifting a finger.
            </p>

            <div className={styles.heroCtas}>
              <Link
                href={PUBLIC.signup}
                className={styles.ctaPrimary}
                data-cta={`vertical-${slug}-signup`}
              >
                Start free — no card
                <ArrowRight size={18} />
              </Link>
              <Link href={PUBLIC.demo} className={styles.ctaSecondary}>
                See it working
              </Link>
            </div>

            <div className={styles.heroTrust}>
              <span className={styles.heroTrustItem}>
                <ShieldCheck size={16} className={styles.heroTrustIcon} />
                Official Meta Cloud API
              </span>
              <span className={styles.heroTrustItem}>
                <CheckCircle2 size={16} className={styles.heroTrustIcon} />
                Keep your existing number
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              How it works for {vertical.plural.toLowerCase()}
            </h2>
            <p className={styles.sectionLead}>{job.detail}</p>
          </div>

          <div className={styles.steps}>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Add your {vertical.itemNoun.plural.toLowerCase()}</h3>
              <p className={styles.stepBody}>
                With prices and availability. Change something and the automation reflects
                it the same second.
              </p>
            </div>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Publish the template</h3>
              <p className={styles.stepBody}>
                Written for {vertical.plural.toLowerCase()} already. Adjust the wording so
                it sounds like you, then publish.
              </p>
            </div>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Connect your number</h3>
              <p className={styles.stepBody}>
                Your customers keep messaging the same account. They just stop waiting for
                a reply.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionWarm}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Also built for</h2>
          </div>
          <div className={styles.grid3}>
            {others.map((other) => (
              <Link
                key={other.slug}
                href={PUBLIC.vertical(other.slug)}
                className={styles.card}
              >
                <h3 className={styles.cardTitle}>{other.plural}</h3>
                <p className={styles.cardBody}>{other.doingByHand}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionDark}>
        <div className={`${styles.container} ${styles.finalCta}`}>
          <h2 className={styles.finalCtaTitle}>
            Try it with your own {vertical.itemNoun.plural.toLowerCase()}
          </h2>
          <p className={styles.finalCtaLead}>
            Free to set up and test. Nothing goes live to a customer until you publish it.
          </p>
          <div className={styles.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={styles.ctaPrimary}>
              Start free
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.setupService} className={styles.ctaSecondary}>
              Have us set it up
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
