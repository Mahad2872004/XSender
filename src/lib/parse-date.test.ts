import { describe, expect, it } from 'vitest';
import { isMonthFirst, parseCustomerDate } from './parse-date';

// A fixed Wednesday, so "next friday" and "today" are deterministic.
const NOW = new Date('2026-08-05T09:00:00Z');
const UK = { locale: 'en-GB', timeZone: 'Europe/London', now: NOW };
const US = { locale: 'en-US', timeZone: 'America/New_York', now: NOW };
const PK = { locale: 'en-PK', timeZone: 'Asia/Karachi', now: NOW };

describe('isMonthFirst', () => {
  it('is true for the United States', () => {
    expect(isMonthFirst('en-US')).toBe(true);
  });

  it('is false for everywhere that writes day first', () => {
    for (const locale of ['en-GB', 'en-PK', 'de-DE', 'fr-FR', 'ar-AE', 'en-IN']) {
      expect(isMonthFirst(locale)).toBe(false);
    }
  });
});

describe('parseCustomerDate — the ambiguity that made this necessary', () => {
  it('reads 03/04/2026 as 3 April outside the US', () => {
    expect(parseCustomerDate('03/04/2026', UK)?.date).toBe('2026-04-03');
    expect(parseCustomerDate('03/04/2026', PK)?.date).toBe('2026-04-03');
  });

  it('reads the same string as 4 March in the US', () => {
    // The month apart that new Date() would have silently got wrong.
    expect(parseCustomerDate('03/04/2026', US)?.date).toBe('2026-03-04');
  });

  it('flags that reading as ambiguous so the caller confirms it', () => {
    expect(parseCustomerDate('03/04/2026', UK)?.ambiguous).toBe(true);
  });

  it('is not ambiguous when only one reading is a real date', () => {
    const parsed = parseCustomerDate('25/12/2026', US);
    expect(parsed?.date).toBe('2026-12-25');
    // 25 cannot be a month, so there is nothing to confirm.
    expect(parsed?.ambiguous).toBe(false);
  });
});

describe('parseCustomerDate — formats customers actually type', () => {
  it('accepts ISO', () => {
    expect(parseCustomerDate('2026-08-14', UK)?.date).toBe('2026-08-14');
    expect(parseCustomerDate('2026-08-14', UK)?.ambiguous).toBe(false);
  });

  it('accepts month names in either order', () => {
    expect(parseCustomerDate('14 Aug', UK)?.date).toBe('2026-08-14');
    expect(parseCustomerDate('Aug 14', US)?.date).toBe('2026-08-14');
    expect(parseCustomerDate('14 August 2027', UK)?.date).toBe('2027-08-14');
  });

  it('accepts relative words', () => {
    expect(parseCustomerDate('today', UK)?.date).toBe('2026-08-05');
    expect(parseCustomerDate('tomorrow', UK)?.date).toBe('2026-08-06');
    expect(parseCustomerDate('tmrw', UK)?.date).toBe('2026-08-06');
  });

  it('accepts weekday names, always looking forward', () => {
    // 5 August 2026 is a Wednesday.
    expect(parseCustomerDate('friday', UK)?.date).toBe('2026-08-07');
    expect(parseCustomerDate('next monday', UK)?.date).toBe('2026-08-10');
    // Saying "wednesday" on a Wednesday means the next one, not today.
    expect(parseCustomerDate('wednesday', UK)?.date).toBe('2026-08-12');
  });

  it('accepts dot and dash separators, and two-digit years', () => {
    expect(parseCustomerDate('14.08.2026', UK)?.date).toBe('2026-08-14');
    expect(parseCustomerDate('14-08-26', UK)?.date).toBe('2026-08-14');
  });

  it('rolls a bare day and month forward to the next occurrence', () => {
    // Asked in August, "14 Jan" means next January, not one gone by.
    expect(parseCustomerDate('14 Jan', UK)?.date).toBe('2027-01-14');
  });
});

describe('parseCustomerDate — times', () => {
  it('picks up a time alongside the date', () => {
    const parsed = parseCustomerDate('14 Aug at 3pm', UK);
    expect(parsed?.date).toBe('2026-08-14');
    expect(parsed?.minutes).toBe(15 * 60);
  });

  it('understands 24-hour and minutes', () => {
    expect(parseCustomerDate('tomorrow 15:30', UK)?.minutes).toBe(15 * 60 + 30);
    expect(parseCustomerDate('tomorrow 7.45pm', UK)?.minutes).toBe(19 * 60 + 45);
  });

  it('handles midnight and noon correctly', () => {
    expect(parseCustomerDate('tomorrow 12am', UK)?.minutes).toBe(0);
    expect(parseCustomerDate('tomorrow 12pm', UK)?.minutes).toBe(12 * 60);
  });

  it('does not mistake a day number for an hour', () => {
    // "14 Aug" must not read 14 as 14:00 and lose the day.
    expect(parseCustomerDate('14 Aug', UK)?.minutes).toBeNull();
  });
});

describe('parseCustomerDate — rejects what it cannot read', () => {
  it('returns null rather than guessing', () => {
    for (const input of ['', 'sometime next month', 'asap', 'whenever', '99/99/9999']) {
      expect(parseCustomerDate(input, UK)).toBeNull();
    }
  });

  it('rejects impossible dates', () => {
    expect(parseCustomerDate('31/02/2026', UK)).toBeNull();
    expect(parseCustomerDate('2026-02-30', UK)).toBeNull();
  });
});

describe('parseCustomerDate — timezone', () => {
  it('resolves "today" in the business timezone, not the server one', () => {
    // 20:00 UTC is already the next day in Karachi.
    const lateUtc = new Date('2026-08-05T20:00:00Z');
    expect(parseCustomerDate('today', { ...UK, now: lateUtc })?.date).toBe('2026-08-05');
    expect(parseCustomerDate('today', { ...PK, now: lateUtc })?.date).toBe('2026-08-06');
  });
});
