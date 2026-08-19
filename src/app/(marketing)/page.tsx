import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MessageSquareText,
  Moon,
  Receipt,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import { marketingVerticals } from '@/lib/verticals';
import LiveDemo from './LiveDemo';
import RoiCalculator from './RoiCalculator';
import styles from './marketing.module.css';

/**
 * Homepage.
 *
 * Ordered show-before-tell: the working conversation appears before any claim
 * about it. Each section has exactly one job — see the plan's Part B2.
 */

const FAQS = [
  {
    q: 'Will it sound like a robot?',
    a: 'It follows the script you write, so it sounds like your business — not like a chatbot guessing. And the moment it meets something it was not built for, it stops and fetches a person instead of improvising.',
  },
  {
    q: 'Could my WhatsApp number get banned?',
    a: 'No. xSender uses the official WhatsApp Cloud API from Meta, not an unofficial automation trick that risks your account. Your number stays yours, on your own Meta account.',
  },
  {
    q: 'What does Meta charge me?',
    a: 'Meta bills per 24-hour conversation, and the rate depends on your country. You pay Meta directly and we never add a markup — so you always see the real price. Many small businesses land in the first free tier and pay nothing.',
  },
  {
    q: 'I am not technical. Can I actually set this up?',
    a: 'You start from a template built for your kind of business, not a blank canvas — pick it, change the wording, publish. If you would rather not, we will set the whole thing up for you.',
  },
  {
    q: 'What happens if a customer gets stuck?',
    a: 'They cannot. xSender refuses to publish a flow that has a dead end, and every conversation keeps a route to a human. If someone types something unexpected, it hands over and tells them a person is coming.',
  },
  {
    q: 'Which channels does it work with?',
    a: 'WhatsApp, Instagram DMs and Facebook Messenger, all in one inbox. They share Meta’s messaging platform, so connecting one makes the others straightforward.',
  },
  {
    q: 'Do I need to change my phone number?',
    a: 'No. You connect the number you already use, so your customers carry on messaging exactly where they always have.',
  },
];

export default function HomePage() {
  const verticals = marketingVerticals();

  return (
    <>
      {/* 1 — Hero: name the moment, not the category. */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <h1 className={styles.heroTitle}>
              Your customers message at midnight.
              <br />
              <span className={styles.heroTitleAccent}>Your staff don’t.</span>
            </h1>

            <p className={styles.heroLead}>
              xSender answers WhatsApp, Instagram and Facebook messages the way your team
              would — takes the order, books the appointment, sends the updates. And it
              hands over to a person the moment it should.
            </p>

            <div className={styles.heroCtas}>
              <Link href={PUBLIC.signup} className={styles.ctaPrimary} data-cta="hero-signup">
                Start free — no card
                <ArrowRight size={18} />
              </Link>
              <Link href={PUBLIC.demo} className={styles.ctaSecondary} data-cta="hero-demo">
                See it take a real order
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
              <span className={styles.heroTrustItem}>
                <Clock size={16} className={styles.heroTrustIcon} />
                Live in a day
              </span>
            </div>
          </div>

          {/* 2 — Proof before claims, and it is the real engine. */}
          <LiveDemo />
        </div>
      </section>

      {/* 3 — Problem: agitate what they already feel. */}
      <section className={styles.sectionWarm}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>The real cost</span>
            <h2 className={styles.sectionTitle}>
              It’s 11pm. Someone is asking if you’re open.
            </h2>
            <p className={styles.sectionLead}>
              They message three businesses at once. Whoever replies first gets the order.
              If that isn’t you, you never even know it happened.
            </p>
          </div>

          <div className={styles.grid3}>
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <Moon size={22} />
              </div>
              <h3 className={styles.cardTitle}>Messages arrive when nobody’s there</h3>
              <p className={styles.cardBody}>
                Nights, weekends, the middle of a rush. Every unanswered message is
                revenue that quietly went somewhere else.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <MessageSquareText size={22} />
              </div>
              <h3 className={styles.cardTitle}>You’re paying someone to copy-paste</h3>
              <p className={styles.cardBody}>
                The same menu, the same prices, the same opening hours — typed out forty
                times a day by someone you pay a salary.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <Receipt size={22} />
              </div>
              <h3 className={styles.cardTitle}>Orders live inside chat threads</h3>
              <p className={styles.cardBody}>
                Nothing to reconcile at closing, wrong items, double-booked tables, and no
                way to tell how many enquiries you actually got.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 4 — How it works: kill "too complicated". */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Set up in an afternoon</span>
            <h2 className={styles.sectionTitle}>Three steps, no code</h2>
            <p className={styles.sectionLead}>
              You are not building a chatbot. You are picking the conversation your
              business already has, and letting it run itself.
            </p>
          </div>

          <div className={styles.steps}>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Pick a template</h3>
              <p className={styles.stepBody}>
                Ordering, booking, lead capture, or FAQ — already written for your kind of
                business. Change the wording to sound like you.
              </p>
            </div>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Add what you sell</h3>
              <p className={styles.stepBody}>
                Your menu, services or listings, with prices. Mark something unavailable
                and the bot stops offering it immediately.
              </p>
            </div>
            <div className={styles.step}>
              <h3 className={styles.stepTitle}>Connect your number</h3>
              <p className={styles.stepBody}>
                Link the WhatsApp, Instagram or Facebook account you already use. Your
                customers notice nothing except faster replies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — Breadth without a feature list. */}
      <section className={styles.sectionDark}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowDark}`}>What it handles</span>
            <h2 className={styles.sectionTitle}>Four jobs your team does by hand</h2>
            <p className={styles.sectionLead}>
              Every business we serve — restaurant, clinic, salon, agent, shop — is really
              doing the same four things in chat all day.
            </p>
          </div>

          <div className={styles.grid4}>
            <article className={styles.cardDark}>
              <h3 className={styles.cardTitle}>Answer the usual questions</h3>
              <p className={styles.cardBody}>
                Hours, location, prices, delivery — instantly, at any hour.
              </p>
            </article>
            <article className={styles.cardDark}>
              <h3 className={styles.cardTitle}>Take the order or booking</h3>
              <p className={styles.cardBody}>
                Browse, choose, confirm — and it lands as a real record, not a message.
              </p>
            </article>
            <article className={styles.cardDark}>
              <h3 className={styles.cardTitle}>Send the updates</h3>
              <p className={styles.cardBody}>
                Preparing, on its way, delivered. One tap from your staff, or none at all.
              </p>
            </article>
            <article className={styles.cardDark}>
              <h3 className={styles.cardTitle}>Fetch a human</h3>
              <p className={styles.cardBody}>
                Anything unusual goes straight to your team, with the whole thread.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 6 — Their numbers, not our claims. */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Work out the money</span>
            <h2 className={styles.sectionTitle}>What is this costing you right now?</h2>
            <p className={styles.sectionLead}>
              Put your own numbers in. We subtract what we charge and what Meta charges,
              so the figure you end up with is the one you would actually keep.
            </p>
          </div>

          <RoiCalculator />
        </div>
      </section>

      {/* 7 — Route to the page that converts best for them. */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Built for your business</span>
            <h2 className={styles.sectionTitle}>What kind of business are you?</h2>
            <p className={styles.sectionLead}>
              One engine, tuned per industry. Pick yours to see the exact conversation it
              would run for you.
            </p>
          </div>

          <div className={styles.grid3}>
            {verticals.map((vertical) => (
              <Link
                key={vertical.slug}
                href={PUBLIC.vertical(vertical.slug)}
                className={styles.card}
                data-cta={`vertical-${vertical.slug}`}
              >
                <h3 className={styles.cardTitle}>{vertical.plural}</h3>
                <p className={styles.cardBody}>{vertical.doingByHand}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — Answer the three fears that stop the sale. */}
      <section className={styles.sectionWarm}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Before you ask</span>
            <h2 className={styles.sectionTitle}>The three things everyone worries about</h2>
          </div>

          <div className={styles.grid3}>
            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <ShieldCheck size={22} />
              </div>
              <h3 className={styles.cardTitle}>Your number is safe</h3>
              <p className={styles.cardBody}>
                Official Meta Cloud API — not an unofficial workaround that gets accounts
                banned. Your number, your Meta account, your data.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <UserRound size={22} />
              </div>
              <h3 className={styles.cardTitle}>There is always a way to a human</h3>
              <p className={styles.cardBody}>
                Every conversation can reach your team, and the customer is told a person
                is coming. Nobody is left talking to a wall.
              </p>
            </article>

            <article className={styles.card}>
              <div className={styles.cardIcon}>
                <CalendarCheck size={22} />
              </div>
              <h3 className={styles.cardTitle}>It cannot dead-end</h3>
              <p className={styles.cardBody}>
                xSender refuses to publish a flow with an unconnected branch. A customer
                cannot reach a step that goes nowhere, because it will not go live.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* 10 — Their real alternative is a salary, not a competitor. */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Honest comparison</span>
            <h2 className={styles.sectionTitle}>What you would do instead</h2>
            <p className={styles.sectionLead}>
              Most businesses are not choosing between us and another tool. They are
              choosing between us and hiring another person.
            </p>
          </div>

          <div className={styles.compareWrap}>
            <table className={styles.compare}>
              <thead>
                <tr>
                  <th scope="col">&nbsp;</th>
                  <th scope="col">Another staff member</th>
                  <th scope="col">Basic auto-reply</th>
                  <th scope="col">xSender</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Answers at 3am</th>
                  <td>No</td>
                  <td>Yes, but only “we’ll get back to you”</td>
                  <td className={styles.compareUs}>Yes, properly</td>
                </tr>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Takes a full order</th>
                  <td>Yes</td>
                  <td>No</td>
                  <td className={styles.compareUs}>Yes</td>
                </tr>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Checks real availability</th>
                  <td>Sometimes</td>
                  <td>No</td>
                  <td className={styles.compareUs}>Yes — never double-books</td>
                </tr>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Creates a record you can act on</th>
                  <td>If they remember</td>
                  <td>No</td>
                  <td className={styles.compareUs}>Every time</td>
                </tr>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Needs training and cover</th>
                  <td>Yes</td>
                  <td>No</td>
                  <td className={styles.compareUs}>No</td>
                </tr>
                <tr>
                  <th scope="row" className={styles.compareRowLabel}>Monthly cost</th>
                  <td>A full salary</td>
                  <td>Free, and worth it</td>
                  <td className={styles.compareUs}>From $29</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 12 — FAQ doubles as objection handling and long-tail SEO. */}
      <section className={styles.sectionWarm}>
        <div className={styles.container}>
          <div className={styles.narrow}>
            <div className={styles.sectionHead}>
              <span className={styles.eyebrow}>Questions</span>
              <h2 className={styles.sectionTitle}>Everything people ask us first</h2>
            </div>

            <div className={styles.faqList}>
              {FAQS.map((faq) => (
                <details key={faq.q} className={styles.faqItem}>
                  <summary>{faq.q}</summary>
                  <p className={styles.faqAnswer}>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 14 — Two intents, two paths. */}
      <section className={styles.sectionDark}>
        <div className={`${styles.container} ${styles.finalCta}`}>
          <h2 className={styles.finalCtaTitle}>Stop answering the same message</h2>
          <p className={styles.finalCtaLead}>
            Set it up yourself in an afternoon, or let us build it for you and hand you
            something that already works.
          </p>
          <div className={styles.finalCtaButtons}>
            <Link href={PUBLIC.signup} className={styles.ctaPrimary} data-cta="footer-signup">
              Start free — no card
              <ArrowRight size={18} />
            </Link>
            <Link
              href={PUBLIC.setupService}
              className={styles.ctaSecondary}
              data-cta="footer-setup"
            >
              Have us set it up
            </Link>
          </div>
        </div>
      </section>

      {/* FAQPage structured data — earns the expandable results in Google. */}
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
