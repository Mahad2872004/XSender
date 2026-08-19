import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import { SETUP_TIERS } from '@/lib/pricing';
import shared from '../marketing.module.css';
import styles from './setup.module.css';

export const metadata: Metadata = {
  title: 'Done-for-you setup',
  description:
    'We build your WhatsApp, Instagram and Messenger automation for you — your menu, your services, your words. Live in seven days or your money back.',
  alternates: { canonical: PUBLIC.setupService },
};

const FAQS = [
  {
    q: 'How long does it take?',
    a: 'Seven days from the discovery call, usually less. Most of that is waiting on Meta to approve your WhatsApp Business account, which we handle for you.',
  },
  {
    q: 'What do you need from me?',
    a: 'A 30-minute call, your menu or service list in whatever form you have it, and access to your Facebook Business account. That is genuinely all.',
  },
  {
    q: 'Is this on top of the subscription?',
    a: 'Yes. Setup is a one-time fee for the build; the subscription keeps it running. If you would rather build it yourself, the software works perfectly well without us.',
  },
  {
    q: 'What if I want to change something later?',
    a: 'You own it. Everything we build is editable in your own account, on the same canvas you would have used. We are not holding the keys.',
  },
  {
    q: 'What does the guarantee actually mean?',
    a: 'If your automation is not live and taking real conversations within seven days of the discovery call, we refund the setup fee. The only exception is if we are still waiting on you for information or Meta approval.',
  },
];

export default function SetupServicePage() {
  return (
    <>
      <section className={shared.hero}>
        <div className={shared.heroInner}>
          <div>
            <span className={`${shared.eyebrow} ${shared.eyebrowDark}`}>Done for you</span>
            <h1 className={shared.heroTitle}>
              You don’t want software.
              <br />
              <span className={shared.heroTitleAccent}>You want it handled.</span>
            </h1>
            <p className={shared.heroLead}>
              Tell us how your business works. We build the automation, connect your
              number, watch the first fifty conversations, and hand you something that
              already works.
            </p>

            <div className={shared.heroCtas}>
              <Link href={PUBLIC.contact} className={shared.ctaPrimary} data-cta="setup-hero">
                Book a discovery call
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className={shared.heroTrust}>
              <span className={shared.heroTrustItem}>
                <ShieldCheck size={16} className={shared.heroTrustIcon} />
                Live in 7 days or your money back
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.sectionHead}>
            <span className={shared.eyebrow}>The process</span>
            <h2 className={shared.sectionTitle}>Four steps, one week</h2>
            <p className={shared.sectionLead}>
              Fixed scope and a fixed price. You are not buying our hours — you are buying
              a working automation.
            </p>
          </div>

          <div className={shared.steps}>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>We learn how you work</h3>
              <p className={shared.stepBody}>
                A 30-minute call. What people ask, what you sell, where it goes wrong, and
                what you want to stop doing yourself.
              </p>
            </div>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>We build it</h3>
              <p className={shared.stepBody}>
                Your real menu or services, loaded and priced. Conversations written in
                your words, not template language.
              </p>
            </div>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>We connect your number</h3>
              <p className={shared.stepBody}>
                Including the Meta Business verification, which is the part most people get
                stuck on.
              </p>
            </div>
          </div>

          <div className={styles.finalStep}>
            <h3 className={shared.stepTitle}>Then we watch it work</h3>
            <p className={shared.stepBody}>
              We read the first fifty real conversations and tune the wording where
              customers hesitate. This is the step nobody else includes, and it is the one
              that decides whether the automation actually gets used.
            </p>
          </div>
        </div>
      </section>

      <section className={shared.sectionWarm}>
        <div className={shared.container}>
          <div className={shared.sectionHead}>
            <span className={shared.eyebrow}>What it costs</span>
            <h2 className={shared.sectionTitle}>Priced against a week of wages</h2>
            <p className={shared.sectionLead}>
              One-time. The subscription is separate and starts after your trial.
            </p>
          </div>

          <div className={styles.tierGrid}>
            {SETUP_TIERS.map((tier) => (
              <article
                key={tier.id}
                className={'highlighted' in tier && tier.highlighted ? styles.tierFeatured : styles.tier}
              >
                <h3 className={styles.tierName}>{tier.name}</h3>
                <p className={styles.tierPrice}>${tier.usd}</p>
                <p className={styles.tierSummary}>{tier.summary}</p>

                <ul className={styles.tierList}>
                  {tier.includes.map((item) => (
                    <li key={item} className={styles.tierItem}>
                      <Check size={16} className={styles.tierCheck} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href={PUBLIC.contact} className={styles.tierCta} data-cta={`setup-${tier.id}`}>
                  Book a call
                </Link>
              </article>
            ))}
          </div>

          <div className={styles.guarantee}>
            <ShieldCheck size={22} className={styles.guaranteeIcon} />
            <div>
              <h3 className={styles.guaranteeTitle}>Live in seven days, or your money back</h3>
              <p className={styles.guaranteeBody}>
                If your automation is not taking real conversations within seven days of the
                discovery call, we refund the setup fee in full. The clock pauses only while
                we are waiting on you or on Meta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.narrow}>
            <div className={shared.sectionHead}>
              <h2 className={shared.sectionTitle}>Before you book</h2>
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
          <h2 className={shared.finalCtaTitle}>Let’s get it off your plate</h2>
          <p className={shared.finalCtaLead}>
            Thirty minutes on a call, seven days to live. Or start free and build it
            yourself — the software is the same either way.
          </p>
          <div className={shared.finalCtaButtons}>
            <Link href={PUBLIC.contact} className={shared.ctaPrimary} data-cta="setup-final">
              Book a discovery call
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.signup} className={shared.ctaSecondary}>
              Start free instead
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
