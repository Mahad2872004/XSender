import type { Metadata } from 'next';
import { PUBLIC } from '@/lib/routes';
import shared from '../../marketing.module.css';
import styles from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Terms',
  description: 'The terms under which you can use xSender.',
  alternates: { canonical: PUBLIC.terms },
};

export default function TermsPage() {
  return (
    <section className={shared.section}>
      <div className={shared.container}>
        <div className={shared.narrow}>
          <h1 className={shared.sectionTitle}>Terms of service</h1>
          <p className={styles.updated}>Last updated: {new Date().getFullYear()}</p>

          <div className={styles.prose}>
            <p className={styles.callout}>
              <strong>Draft.</strong> These reflect how the service actually works today.
              They need legal review before we take payment.
            </p>

            <h2>The service</h2>
            <p>
              xSender lets you automate conversations on messaging channels you own. We
              provide the software; you provide the content, the channel, and the
              relationship with your customers.
            </p>

            <h2>Your responsibilities</h2>
            <ul>
              <li>
                You must comply with Meta’s WhatsApp Business, Instagram and Messenger
                policies. Breaking them can get your number restricted, and that is between
                you and Meta.
              </li>
              <li>
                You must have permission to message the people you message. Do not import
                lists you did not collect.
              </li>
              <li>You are responsible for what your automations say.</li>
            </ul>

            <h2>Messaging costs</h2>
            <p>
              Meta charges you directly for message delivery through your own account. We
              do not resell messaging and we add no markup. Those charges are separate from
              your xSender subscription and are not refundable by us.
            </p>

            <h2>Billing</h2>
            <p>
              Plans are monthly and you can cancel at any time. Cancelling stops the next
              renewal; we do not refund part-months. Setup services are covered by their own
              guarantee, described on that page.
            </p>

            <h2>Availability</h2>
            <p>
              We work to keep xSender running, but we do not currently offer a contractual
              uptime guarantee. We will tell you plainly when something breaks rather than
              quietly hoping you did not notice.
            </p>

            <h2>Your data</h2>
            <p>
              It stays yours. You can export it at any time, and we delete it on request.
              See the <a href={PUBLIC.privacy}>privacy page</a>.
            </p>

            <h2>Ending it</h2>
            <p>
              You can close your account whenever you like. We may suspend an account that
              is being used for spam, fraud, or anything that puts our Meta standing at
              risk — we will tell you why.
            </p>

            <h2>Contact</h2>
            <p>hello@promptly.pk</p>
          </div>
        </div>
      </div>
    </section>
  );
}
