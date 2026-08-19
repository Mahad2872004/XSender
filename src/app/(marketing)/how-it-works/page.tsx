import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import shared from '../marketing.module.css';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Pick a template, add what you sell, connect your number. xSender runs the conversation your business already has — and hands to a person when it should.',
  alternates: { canonical: PUBLIC.howItWorks },
};

export default function HowItWorksPage() {
  return (
    <>
      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.narrow}>
            <span className={shared.eyebrow}>How it works</span>
            <h1 className={shared.sectionTitle}>
              It is not a chatbot. It is your process, running itself.
            </h1>
            <p className={shared.sectionLead}>
              A chatbot guesses what to say. xSender follows the conversation you already
              have with customers every day — the same questions, the same order, the same
              answers — and stops the moment it meets something it was not built for.
            </p>
          </div>
        </div>
      </section>

      <section className={shared.sectionWarm}>
        <div className={shared.container}>
          <div className={shared.sectionHead}>
            <h2 className={shared.sectionTitle}>Setting it up</h2>
          </div>

          <div className={shared.steps}>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>Pick a template</h3>
              <p className={shared.stepBody}>
                Ordering, booking, lead capture or FAQ — already written for your kind of
                business. It opens on a canvas where every step is a box you can read and
                edit in plain language.
              </p>
            </div>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>Add what you sell</h3>
              <p className={shared.stepBody}>
                Your menu, treatments, listings or products, with prices. The automation
                reads this live — mark something unavailable and it stops being offered
                the same second.
              </p>
            </div>
            <div className={shared.step}>
              <h3 className={shared.stepTitle}>Publish and connect</h3>
              <p className={shared.stepBody}>
                Test it against a simulated customer first. When you are happy, connect the
                WhatsApp, Instagram or Facebook account you already use.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={shared.section}>
        <div className={shared.container}>
          <div className={shared.sectionHead}>
            <h2 className={shared.sectionTitle}>What happens when someone messages</h2>
            <p className={shared.sectionLead}>
              Every conversation follows a path you designed, and every path ends
              somewhere real.
            </p>
          </div>

          <div className={shared.grid2}>
            <article className={shared.card}>
              <h3 className={shared.cardTitle}>It answers, and remembers</h3>
              <p className={shared.cardBody}>
                Answers get saved against the customer’s record as it goes, so nothing is
                asked twice. When they come back next week and ask where their order is,
                it already knows which order they mean.
              </p>
            </article>

            <article className={shared.card}>
              <h3 className={shared.cardTitle}>It creates a real record</h3>
              <p className={shared.cardBody}>
                An order becomes an order, with items, address and total. A booking checks
                genuine availability and can never double-book, because the database itself
                refuses overlapping reservations.
              </p>
            </article>

            <article className={shared.card}>
              <h3 className={shared.cardTitle}>It knows when to stop</h3>
              <p className={shared.cardBody}>
                Something unexpected, an unclear answer three times over, or a customer
                asking for a person — all of it goes to your team with the whole thread,
                and the customer is told help is coming.
              </p>
            </article>

            <article className={shared.card}>
              <h3 className={shared.cardTitle}>You can see why it did that</h3>
              <p className={shared.cardBody}>
                Every conversation keeps a step-by-step record of which path it took and
                what it collected. When something reads oddly, you can see exactly where
                and fix that one step.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={shared.sectionDark}>
        <div className={`${shared.container} ${shared.finalCta}`}>
          <h2 className={shared.finalCtaTitle}>Build one in an afternoon</h2>
          <p className={shared.finalCtaLead}>
            Free to set up and test. Nothing reaches a customer until you publish.
          </p>
          <div className={shared.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={shared.ctaPrimary} data-cta="how-final">
              Start free — no card
              <ArrowRight size={18} />
            </Link>
            <Link href={PUBLIC.setupService} className={shared.ctaSecondary}>
              Have us build it
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
