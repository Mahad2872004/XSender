import { describe, expect, it } from 'vitest';
import {
  addDaysToDateString,
  formatInZone,
  offsetMs,
  parseDateString,
  startOfZonedDay,
  zonedDateString,
  zonedParts,
  zonedTimeToUtc,
  zonedWeekday,
} from './timezone';

const HOUR = 3_600_000;

describe('offsetMs', () => {
  it('is zero for UTC', () => {
    expect(offsetMs('UTC', new Date('2026-08-05T12:00:00Z'))).toBe(0);
  });

  it('is +5h for Pakistan, which has no DST', () => {
    expect(offsetMs('Asia/Karachi', new Date('2026-01-15T12:00:00Z'))).toBe(5 * HOUR);
    expect(offsetMs('Asia/Karachi', new Date('2026-07-15T12:00:00Z'))).toBe(5 * HOUR);
  });

  it('tracks DST in New York', () => {
    // Standard time in January, daylight time in July.
    expect(offsetMs('America/New_York', new Date('2026-01-15T12:00:00Z'))).toBe(-5 * HOUR);
    expect(offsetMs('America/New_York', new Date('2026-07-15T12:00:00Z'))).toBe(-4 * HOUR);
  });

  it('handles half-hour zones', () => {
    expect(offsetMs('Asia/Kolkata', new Date('2026-08-05T12:00:00Z'))).toBe(5.5 * HOUR);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts a Karachi wall-clock time to the right instant', () => {
    // 12:00 in Karachi is 07:00 UTC.
    const utc = zonedTimeToUtc('Asia/Karachi', {
      year: 2026,
      month: 8,
      day: 14,
      hour: 12,
      minute: 0,
    });
    expect(utc.toISOString()).toBe('2026-08-14T07:00:00.000Z');
  });

  it('is the identity for UTC', () => {
    const utc = zonedTimeToUtc('UTC', { year: 2026, month: 8, day: 14, hour: 12, minute: 30 });
    expect(utc.toISOString()).toBe('2026-08-14T12:30:00.000Z');
  });

  it('applies daylight time when the date falls inside it', () => {
    // 12:00 in New York in July is 16:00 UTC (EDT, -4).
    const summer = zonedTimeToUtc('America/New_York', {
      year: 2026,
      month: 7,
      day: 15,
      hour: 12,
    });
    expect(summer.toISOString()).toBe('2026-07-15T16:00:00.000Z');

    // The same wall-clock time in January is 17:00 UTC (EST, -5).
    const winter = zonedTimeToUtc('America/New_York', {
      year: 2026,
      month: 1,
      day: 15,
      hour: 12,
    });
    expect(winter.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('survives the spring-forward boundary', () => {
    // US clocks jump 02:00 EST → 03:00 EDT on 8 March 2026. 03:00 local is
    // therefore 07:00 UTC (EDT is -4), not 08:00. A single-pass offset lookup
    // reads EST at the guessed instant and lands an hour out; the second pass
    // is what fixes it.
    const afterJump = zonedTimeToUtc('America/New_York', {
      year: 2026,
      month: 3,
      day: 8,
      hour: 3,
    });
    expect(afterJump.toISOString()).toBe('2026-03-08T07:00:00.000Z');
  });

  it('resolves a wall-clock time that does not exist to the instant before the gap', () => {
    // 02:30 never happens on 8 March 2026 — the clock skips straight past it.
    // We resolve to 01:30 local rather than throwing, because a customer
    // picking a slot should never see an error; and since the offered time is
    // rendered back from this instant, the label stays self-consistent.
    const skipped = zonedTimeToUtc('America/New_York', {
      year: 2026,
      month: 3,
      day: 8,
      hour: 2,
      minute: 30,
    });
    expect(skipped.toISOString()).toBe('2026-03-08T06:30:00.000Z');
    expect(zonedParts('America/New_York', skipped).hour).toBe(1);
  });

  it('survives the autumn fall-back boundary', () => {
    // Clocks go back 02:00 → 01:00 on 1 November 2026. 12:00 is unambiguous.
    const midday = zonedTimeToUtc('America/New_York', {
      year: 2026,
      month: 11,
      day: 1,
      hour: 12,
    });
    expect(midday.toISOString()).toBe('2026-11-01T17:00:00.000Z');
  });

  it('round-trips through zonedParts', () => {
    for (const zone of ['UTC', 'Asia/Karachi', 'America/New_York', 'Australia/Sydney']) {
      const utc = zonedTimeToUtc(zone, { year: 2026, month: 6, day: 10, hour: 14, minute: 45 });
      const back = zonedParts(zone, utc);
      expect({ h: back.hour, m: back.minute, d: back.day }).toEqual({ h: 14, m: 45, d: 10 });
    }
  });
});

describe('zonedWeekday', () => {
  it('reads the weekday in the workspace zone, not the server zone', () => {
    // 22:00 UTC on Friday is already Saturday in Sydney.
    const instant = new Date('2026-08-07T22:00:00Z'); // Friday in UTC
    expect(zonedWeekday('UTC', instant)).toBe(5); // Friday
    expect(zonedWeekday('Australia/Sydney', instant)).toBe(6); // Saturday
  });
});

describe('zonedDateString', () => {
  it('gives the local calendar date, not the UTC one', () => {
    const instant = new Date('2026-08-07T20:00:00Z');
    expect(zonedDateString('UTC', instant)).toBe('2026-08-07');
    // 20:00 UTC is 01:00 the next day in Karachi.
    expect(zonedDateString('Asia/Karachi', instant)).toBe('2026-08-08');
  });
});

describe('startOfZonedDay', () => {
  it('is local midnight expressed as UTC', () => {
    expect(startOfZonedDay('Asia/Karachi', '2026-08-14')?.toISOString()).toBe(
      '2026-08-13T19:00:00.000Z'
    );
  });

  it('rejects a malformed date', () => {
    expect(startOfZonedDay('UTC', 'not-a-date')).toBeNull();
  });
});

describe('parseDateString', () => {
  it('accepts an ISO calendar date', () => {
    expect(parseDateString('2026-08-14')).toEqual({ year: 2026, month: 8, day: 14 });
  });

  it('rejects out-of-range months and rubbish', () => {
    expect(parseDateString('2026-13-01')).toBeNull();
    expect(parseDateString('14/08/2026')).toBeNull();
  });
});

describe('addDaysToDateString', () => {
  it('crosses month boundaries', () => {
    expect(addDaysToDateString('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('crosses year boundaries', () => {
    expect(addDaysToDateString('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles leap days', () => {
    expect(addDaysToDateString('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('formatInZone', () => {
  it('renders the time an observer in that zone would see', () => {
    const instant = new Date('2026-08-14T07:00:00Z');
    const formatted = formatInZone(instant, 'Asia/Karachi', 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(formatted).toBe('12:00');
  });
});
