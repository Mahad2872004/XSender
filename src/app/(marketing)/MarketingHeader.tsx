'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Send, X } from 'lucide-react';
import { APP, PUBLIC } from '@/lib/routes';
import styles from './marketing.module.css';

/**
 * Five links, no more.
 *
 * Every additional nav item measurably splits attention away from the primary
 * CTA, and on a page whose whole job is one conversion that trade is rarely
 * worth it.
 */
const LINKS = [
  { href: PUBLIC.howItWorks, label: 'How it works' },
  { href: PUBLIC.pricing, label: 'Pricing' },
  { href: PUBLIC.demo, label: 'Live demo' },
  { href: PUBLIC.setupService, label: 'Done for you' },
];

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Condense the bar once the hero is behind you, so it stops competing with
  // the content but stays reachable.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A menu that stays open behind a navigation is a trap on mobile.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <div className={styles.headerInner}>
        <Link href={PUBLIC.home} className={styles.logo} aria-label="xSender home">
          <Send size={22} className={styles.logoMark} />
          <span>xSender</span>
        </Link>

        <nav className={styles.nav} aria-label="Main">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link href={PUBLIC.login} className={styles.signIn}>
            Sign in
          </Link>
          <Link href={PUBLIC.signup} className={styles.ctaSmall} data-cta="header-signup">
            Start free
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className={styles.mobileMenu}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href={PUBLIC.login} className={styles.mobileLink} onClick={() => setOpen(false)}>
            Sign in
          </Link>
          <Link
            href={PUBLIC.signup}
            className={styles.ctaSmall}
            data-cta="mobile-signup"
            onClick={() => setOpen(false)}
          >
            Start free
          </Link>
          <Link href={APP.dashboard} className={styles.mobileLinkMuted} onClick={() => setOpen(false)}>
            Go to dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
