'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether the visitor has asked their OS to reduce motion.
 *
 * useSyncExternalStore rather than useState + useEffect: setting state
 * synchronously inside an effect triggers a cascading render, and React's lint
 * rules rightly flag it. The server snapshot is `false` so markup matches on
 * first paint, then the real preference takes over on hydration.
 *
 * CSS handles most of this via the global @media rule, but JavaScript-driven
 * sequences — anything on a timer — have to check it themselves.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
