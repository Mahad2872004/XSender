/**
 * Conversion tracking.
 *
 * Deliberately provider-agnostic and optional: with nothing configured every
 * call is a no-op, so the site works locally and in CI without a vendor. The
 * default provider is Plausible, which is cookieless — that keeps the EU
 * cookie-consent banner off a page whose entire job is one conversion, and
 * matches the privacy position stated on /legal/privacy.
 *
 * Events are named for the decision they represent, not the element clicked,
 * so a redesign does not orphan the funnel.
 */

export type AnalyticsEvent =
  | 'signup_started'
  | 'demo_opened'
  | 'demo_message_sent'
  | 'demo_order_completed'
  | 'roi_calculated'
  | 'pricing_viewed'
  | 'setup_call_started'
  | 'vertical_selected';

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return;

  if (window.plausible) {
    window.plausible(event, { props });
    return;
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event, ...props });
    return;
  }

  // Nothing configured. Surfaced in development so the funnel can be checked
  // without signing up to anything; silent in production.
  if (process.env.NODE_ENV === 'development') {
    console.info(`[analytics] ${event}`, props);
  }
}

/**
 * Which event a `data-cta` value maps to.
 *
 * Keeps every call-to-action on the site reporting into a small, stable set of
 * funnel steps rather than one event per button.
 */
export function eventForCta(cta: string): AnalyticsEvent | null {
  if (cta.includes('signup')) return 'signup_started';
  if (cta.includes('demo')) return 'demo_opened';
  if (cta.includes('setup')) return 'setup_call_started';
  if (cta.startsWith('pricing-')) return 'pricing_viewed';
  if (cta.startsWith('vertical-')) return 'vertical_selected';
  return null;
}
