'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { eventForCta, track } from '@/lib/analytics';

/**
 * Loads the analytics script and reports every CTA click.
 *
 * One delegated listener on the document rather than an onClick on each
 * button: the CTAs already carry `data-cta`, and threading a handler through
 * every server component would force half the marketing site to become client
 * components for no other reason.
 */
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest('[data-cta]');
      if (!target) return;

      const cta = target.getAttribute('data-cta');
      if (!cta) return;

      const name = eventForCta(cta);
      if (name) track(name, { cta, path: window.location.pathname });
    }

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.tagged-events.js"
      strategy="afterInteractive"
    />
  );
}
