import type { Metadata } from 'next';
import Analytics from './Analytics';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';
import styles from './marketing.module.css';

/**
 * Public shell. No sidebar, no auth requirement.
 *
 * Everything under here is statically rendered — marketing pages must not
 * inherit the dashboard's per-request rendering, or first paint suffers on
 * exactly the pages where bounce rate is decided.
 */

const TITLE = 'xSender — Automate WhatsApp, Instagram and Facebook messages';
const DESCRIPTION =
  'Your customers message at midnight. Your staff don’t. xSender answers, takes the order, books the appointment, and hands over to a person when it should.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: TITLE, template: '%s · xSender' },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'xSender',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Analytics />
      <MarketingHeader />
      <main id="main">{children}</main>
      <MarketingFooter />
    </div>
  );
}
