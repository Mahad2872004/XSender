import Link from 'next/link';
import { Send } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import { VERTICALS } from '@/lib/verticals';
import styles from './marketing.module.css';

/**
 * The footer does real SEO work: it is the internal link hub that gives every
 * vertical page a crawlable path from the homepage.
 */
export default function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <Link href={PUBLIC.home} className={styles.footerLogo}>
            <Send size={20} className={styles.logoMark} />
            <span>xSender</span>
          </Link>
          <p className={styles.footerTagline}>
            Automation for businesses that still answer every message by hand.
          </p>
          <p className={styles.footerMeta}>Built by Promptly.</p>
        </div>

        <div className={styles.footerCol}>
          <h3 className={styles.footerHeading}>Product</h3>
          <Link href={PUBLIC.howItWorks} className={styles.footerLink}>How it works</Link>
          <Link href={PUBLIC.demo} className={styles.footerLink}>Live demo</Link>
          <Link href={PUBLIC.pricing} className={styles.footerLink}>Pricing</Link>
          <Link href={PUBLIC.setupService} className={styles.footerLink}>Done-for-you setup</Link>
        </div>

        <div className={styles.footerCol}>
          <h3 className={styles.footerHeading}>For your business</h3>
          {VERTICALS.filter((v) => v.marketingPage)
            .slice(0, 6)
            .map((vertical) => (
              <Link
                key={vertical.slug}
                href={PUBLIC.vertical(vertical.slug)}
                className={styles.footerLink}
              >
                {vertical.plural}
              </Link>
            ))}
        </div>

        <div className={styles.footerCol}>
          <h3 className={styles.footerHeading}>Company</h3>
          <Link href={PUBLIC.about} className={styles.footerLink}>About</Link>
          <Link href={PUBLIC.contact} className={styles.footerLink}>Contact</Link>
          <Link href={PUBLIC.privacy} className={styles.footerLink}>Privacy</Link>
          <Link href={PUBLIC.terms} className={styles.footerLink}>Terms</Link>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>© {year} xSender</span>
        <span className={styles.footerDisclaimer}>
          WhatsApp, Instagram and Messenger are trademarks of Meta Platforms, Inc.
          xSender is an independent product and is not endorsed by Meta.
        </span>
      </div>
    </footer>
  );
}
