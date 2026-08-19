import type { Metadata } from 'next';
import { PUBLIC } from '@/lib/routes';
import shared from '../../marketing.module.css';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What data xSender holds, where it lives, and who can reach it.',
  alternates: { canonical: PUBLIC.privacy },
  robots: { index: true, follow: true },
};

/**
 * Written to be factually accurate about what the system actually does — the
 * tables, the regions, the sub-processors are all real. It still needs a
 * lawyer's eye before launch, particularly the GDPR and DPA sections if you
 * take EU customers.
 */
export default function PrivacyPage() {
  return (
    <section className={shared.section}>
      <div className={shared.container}>
        <div className={shared.narrow}>
          <h1 className={shared.sectionTitle}>Privacy</h1>
          <p className={styles.updated}>Last updated: {new Date().getFullYear()}</p>

          <div className={styles.prose}>
            <p className={styles.callout}>
              <strong>Draft.</strong> This describes what xSender genuinely does with data
              today. It has not yet been reviewed by a lawyer and must be before we take
              customers in the EU or UK.
            </p>

            <h2>Who we are</h2>
            <p>
              xSender is operated by Promptly. If you are a business using xSender, you are
              the data controller for your customers’ messages and we are your processor.
            </p>

            <h2>What we store</h2>
            <ul>
              <li>
                <strong>Your account:</strong> name, email, and the workspaces you belong
                to.
              </li>
              <li>
                <strong>Your customers:</strong> the name, phone number or platform ID they
                message you from, the messages exchanged, and anything your automation
                collects — such as a delivery address or party size.
              </li>
              <li>
                <strong>Your business data:</strong> menus, services, orders, bookings and
                the automations you build.
              </li>
              <li>
                <strong>Channel credentials:</strong> the access token for each connected
                WhatsApp, Instagram or Facebook account, encrypted at rest with AES-256-GCM.
              </li>
            </ul>

            <h2>What we do not do</h2>
            <ul>
              <li>We do not sell data, to anyone, ever.</li>
              <li>We do not use your customers’ messages to train models.</li>
              <li>
                We do not read your conversations except when you ask us for support, or
                where we must to investigate abuse.
              </li>
            </ul>

            <h2>Where it lives</h2>
            <p>
              Data is stored with Supabase on infrastructure in the Mumbai (ap-south-1)
              region. If you require EU or UK data residency, contact us before signing up —
              we will tell you honestly whether we can meet it yet.
            </p>

            <h2>Who else processes it</h2>
            <ul>
              <li><strong>Supabase</strong> — database, authentication and file storage.</li>
              <li><strong>Vercel</strong> — application hosting.</li>
              <li>
                <strong>Meta Platforms</strong> — message delivery on WhatsApp, Instagram
                and Messenger, under your own Meta account.
              </li>
              <li><strong>Stripe</strong> — subscription payments, once billing is enabled.</li>
            </ul>

            <h2>How long we keep it</h2>
            <p>
              For as long as your workspace exists. If you close your account, you can
              export your data for 30 days, after which it is deleted along with everything
              beneath it — contacts, conversations, orders and bookings.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask us for a copy of your data, ask us to correct it, or ask us to
              delete it, by emailing hello@promptly.pk. If one of your own customers makes
              such a request to you, we will help you honour it.
            </p>

            <h2>Security</h2>
            <p>
              Every workspace is isolated at the database level. Channel access tokens are
              encrypted at rest and never exposed to the browser. Access to production is
              limited to the people who operate the service.
            </p>

            <h2>Contact</h2>
            <p>hello@promptly.pk</p>
          </div>
        </div>
      </div>
    </section>
  );
}
