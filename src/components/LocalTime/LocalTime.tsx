'use client';

import { useSyncExternalStore } from 'react';

/**
 * A timestamp rendered in the viewer's own timezone, without a hydration
 * mismatch.
 *
 * Formatting a date directly during render breaks in two ways at once:
 *
 *   - Locale. The server's Node ICU resolves `toLocaleTimeString()` differently
 *     from the browser, so "04:48 AM" on the server meets "04:48 am" on the
 *     client and React throws away the tree.
 *   - Timezone. Worse in production: Vercel runs UTC while the customer is in
 *     PKT, so the server would render an hour that is simply wrong.
 *
 * So the first paint uses a fixed locale and fixed UTC zone — deterministic on
 * both sides — and the real local time is swapped in after mount, where the
 * browser's timezone is actually knowable.
 */

type Style = 'time' | 'datetime' | 'date';

const SERVER_FORMATS: Record<Style, Intl.DateTimeFormatOptions> = {
  time: { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' },
  datetime: {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  },
  date: { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' },
};

const CLIENT_FORMATS: Record<Style, Intl.DateTimeFormatOptions> = {
  time: { hour: '2-digit', minute: '2-digit' },
  datetime: { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
  date: { day: '2-digit', month: 'short', year: 'numeric' },
};

/**
 * Hydration flag via useSyncExternalStore: `false` during SSR and the first
 * client render, `true` afterwards. Preferred over a setState-in-effect, which
 * triggers a cascading render.
 */
const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

export default function LocalTime({
  value,
  style = 'time',
  className,
}: {
  /** ISO 8601 timestamp. */
  value: string;
  style?: Style;
  className?: string;
}) {
  const hydrated = useSyncExternalStore(NEVER_CHANGES, onClient, onServer);

  const text = hydrated
    ? new Intl.DateTimeFormat(undefined, CLIENT_FORMATS[style]).format(new Date(value))
    : new Intl.DateTimeFormat('en-GB', SERVER_FORMATS[style]).format(new Date(value));

  return (
    <time dateTime={value} className={className}>
      {text}
    </time>
  );
}
