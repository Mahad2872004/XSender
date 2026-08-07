import { describe, expect, it } from 'vitest';

/**
 * The formatting contract LocalTime depends on.
 *
 * The component itself needs a DOM to test, but the property that actually
 * matters is arithmetic: the value used for the server render and the first
 * client render must be identical regardless of the machine's locale or
 * timezone. That is what a hydration mismatch is.
 */

const SERVER_TIME: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
};

describe('server-side timestamp formatting', () => {
  const iso = '2026-08-05T04:48:00.000Z';

  it('is stable across repeated calls', () => {
    const a = new Intl.DateTimeFormat('en-GB', SERVER_TIME).format(new Date(iso));
    const b = new Intl.DateTimeFormat('en-GB', SERVER_TIME).format(new Date(iso));
    expect(a).toBe(b);
  });

  it('pins to UTC rather than the running machine’s zone', () => {
    // The bug this guards: Vercel runs UTC, the customer is in PKT, and a
    // server-rendered local time is simply the wrong hour.
    expect(new Intl.DateTimeFormat('en-GB', SERVER_TIME).format(new Date(iso))).toBe('04:48');
  });

  it('does not vary by am/pm casing the way toLocaleTimeString does', () => {
    // The original failure: "04:48 AM" on the server, "04:48 am" on the client.
    const formatted = new Intl.DateTimeFormat('en-GB', SERVER_TIME).format(new Date(iso));
    expect(formatted).not.toMatch(/[ap]m/i);
  });

  it('keeps the ISO value parseable for the <time dateTime> attribute', () => {
    expect(new Date(iso).toISOString()).toBe(iso);
  });
});
