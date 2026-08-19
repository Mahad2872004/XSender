import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import PricingTable from './PricingTable';
import shared from '../marketing.module.css';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple monthly pricing with regional rates, a 14-day free trial, and no markup on Meta’s messaging costs. From $29 a month.',
  alternates: { canonical: PUBLIC.pricing },
};

const FAQS = [
  {
    q: 'What does Meta charge on top?',
    a: 'Meta bills per 24-hour conversation and the rate varies by country — often a few cents, and the first slice of service conversations each month is free. You pay Meta directly from your own account, so you see the real cost with nothing added by us.',
  },
  {
    q: 'Why is the price different in my country?',
    a: 'A price that works in London does not work in Lahore. We set regional rates from purchasing-power data so the product is affordable where you are. Your billing country decides which applies.',
  },
  {
    q: 'What counts as a conversation?',
    a: 'One customer, one 24-hour window, however many messages pass inside it. A customer who orders on Monday and again on Friday is two conversations, not twenty messages.',
  },
  {
    q: 'What happens when I hit the limit?',
    a: 'We tell you before you get there and your automations keep running. You can move up a plan at any time and it is prorated.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. Monthly, cancel whenever. If you cancel, your data stays available for export for 30 days.',
  },
];

export default function PricingPage() {
  return (
    <>
      <section className={shared.section}>
        <div className={shared.container}>
          <div className={`${shared.sectionHead} ${styles.header}`}>
            <span className={shared.eyebrow}>Pricing</span>
            <h1 className={shared.sectionTitle}>
              Less than a week of the salary it replaces
            </h1>
            <p className={shared.sectionLead}>
              Every plan includes a 14-day free trial, unlimited flows, and no markup on
              what Meta charges you for messages.
            </p>
          </div>

          <PricingTable />
        </div>
      </section>

      {/* The blocker in this category is not our price — it is not knowing
          what Meta will charge. Answer it plainly and early. */}
      <section className={shared.sectionWarm}>
        <div className={shared.container}>
          <div className={shared.narrow}>
            <div className={shared.sectionHead}>
              <span className={shared.eyebrow}>The honest bit</span>
              <h2 className={shared.sectionTitle}>What Meta charges, and why we don’t touch it</h2>
            </div>

            <div className={styles.explainer}>
              <p>
                Sending on WhatsApp, Instagram or Messenger costs money — Meta charges per
                24-hour conversation, and the rate depends on which country your customer
                is in. It is usually a few cents, and a slice of service conversations each
                month costs nothing at all.
              </p>
              <p>
                <strong>
                  You connect your own Meta account and pay Meta directly. We never mark it
                  up, and we never resell it.
                </strong>{' '}
                Plenty of tools in this category buy messaging wholesale and charge you
                retail. We would rather you could check the real price yourself.
              </p>
              <p>
                In practice a small clinic or cafe spends very little with Meta, because
                most conversations are started by the customer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.narrow}>
            <div className={shared.sectionHead}>
              <h2 className={shared.sectionTitle}>Pricing questions</h2>
            </div>

            <div className={shared.faqList}>
              {FAQS.map((faq) => (
                <details key={faq.q} className={shared.faqItem}>
                  <summary>{faq.q}</summary>
                  <p className={shared.faqAnswer}>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={shared.sectionDark}>
        <div className={`${shared.container} ${shared.finalCta}`}>
          <h2 className={shared.finalCtaTitle}>Try it before you pay for it</h2>
          <p className={shared.finalCtaLead}>
            Build your automation, test it against your own menu, and only connect a real
            channel when you are happy with it.
          </p>
          <div className={shared.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={shared.ctaPrimary} data-cta="pricing-final">
              Start free — no card
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.setupService} className={shared.ctaSecondary}>
              Have us set it up
            </Link>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          }),
        }}
      />
    </>
  );
}
