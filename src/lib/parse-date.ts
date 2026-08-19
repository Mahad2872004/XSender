import { addDaysToDateString, zonedDateString } from './timezone';

/**
 * Parse a date a customer typed into a chat.
 *
 * `new Date("03/04/2026")` is the trap this replaces: JavaScript reads it as
 * 4 March (US order) regardless of who typed it, while most of the world means
 * 3 April. The customer gets an appointment a month out and nothing looks
 * broken — the worst kind of bug.
 *
 * So day/month order is decided by the workspace's locale, and the caller is
 * expected to echo the result back for confirmation.
 */

/** Locales that write month before day. Everywhere else is day-first. */
const MONTH_FIRST = new Set(['en-us', 'en-ph', 'en-fm', 'en-mh', 'en-pw']);

export function isMonthFirst(locale: string): boolean {
  const lower = locale.toLowerCase();
  if (MONTH_FIRST.has(lower)) return true;

  // Ask Intl rather than guessing from the region: it knows the convention for
  // locales this list has never heard of.
  try {
    const parts = new Intl.DateTimeFormat(locale).formatToParts(new Date(Date.UTC(2020, 0, 2)));
    const order = parts.filter((p) => p.type === 'day' || p.type === 'month');
    return order[0]?.type === 'month';
  } catch {
    return false;
  }
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

export interface ParsedDate {
  /** YYYY-MM-DD in the workspace's timezone. */
  date: string;
  /** Minutes past midnight, when a time was given. */
  minutes: number | null;
  /** True when day/month order had to be inferred and could be misread. */
  ambiguous: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/**
 * Pull a time such as "at 3pm", "15:30" or "7.45pm" out of the string.
 *
 * Both patterns demand strong evidence — an am/pm marker, or a colon. An
 * earlier version accepted a bare four-digit run, which happily read the year
 * in "03/04/2026" as 20:26 and destroyed the date behind it.
 */
const TIME_WITH_MERIDIEM = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)\b/i;
const TIME_24_HOUR = /\b(\d{1,2}):(\d{2})\b/;

function extractTime(input: string): { minutes: number | null; rest: string } {
  const meridiemMatch = input.match(TIME_WITH_MERIDIEM);
  const match = meridiemMatch ?? input.match(TIME_24_HOUR);
  if (!match || match.index === undefined) return { minutes: null, rest: input };

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour > 23 || minute > 59) return { minutes: null, rest: input };

  const meridiem = meridiemMatch ? match[3]?.toLowerCase() : undefined;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return {
    minutes: hour * 60 + minute,
    rest: (input.slice(0, match.index) + input.slice(match.index + match[0].length)).trim(),
  };
}

/**
 * Parse what a customer typed into a calendar date.
 *
 * `today` is the workspace's own current date, so "tomorrow" means tomorrow
 * where the business is, not where the server is.
 */
export function parseCustomerDate(
  input: string,
  options: { locale: string; timeZone: string; now?: Date }
): ParsedDate | null {
  const now = options.now ?? new Date();
  const today = zonedDateString(options.timeZone, now);

  const cleaned = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  const { minutes, rest } = extractTime(cleaned);
  const text = rest.replace(/\b(on|at|the|of|this|coming)\b/g, ' ').replace(/\s+/g, ' ').trim();

  // Relative words first — the most common thing a customer actually types.
  if (/^tod(ay)?$/.test(text) || text === '') {
    if (text === '' && minutes === null) return null;
    return { date: today, minutes, ambiguous: false };
  }
  if (/^tomm?orr?ow$/.test(text) || text === 'tmrw') {
    return { date: addDaysToDateString(today, 1), minutes, ambiguous: false };
  }
  if (/^day after tomm?orr?ow$/.test(text)) {
    return { date: addDaysToDateString(today, 2), minutes, ambiguous: false };
  }

  // "next friday" / "friday"
  const weekdayMatch = text.match(/^(?:next )?([a-z]+)$/);
  if (weekdayMatch && WEEKDAY_NAMES[weekdayMatch[1]] !== undefined) {
    const target = WEEKDAY_NAMES[weekdayMatch[1]];
    const todayIndex = new Date(`${today}T00:00:00Z`).getUTCDay();
    let delta = (target - todayIndex + 7) % 7;
    if (delta === 0) delta = 7; // "friday" said on a Friday means the next one
    return { date: addDaysToDateString(today, delta), minutes, ambiguous: false };
  }

  // ISO — unambiguous by definition.
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    if (!isRealDate(y, m, d)) return null;
    return { date: `${y}-${pad(m)}-${pad(d)}`, minutes, ambiguous: false };
  }

  // "14 aug", "aug 14", "14 august 2026"
  const named = text.match(/^(?:(\d{1,2})\s+([a-z]+)|([a-z]+)\s+(\d{1,2}))(?:\s+(\d{4}))?$/);
  if (named) {
    const day = Number(named[1] ?? named[4]);
    const monthName = (named[2] ?? named[3]) as string;
    const month = MONTH_NAMES[monthName];
    if (month) {
      const year = named[5] ? Number(named[5]) : inferYear(today, month, day);
      if (isRealDate(year, month, day)) {
        return { date: `${year}-${pad(month)}-${pad(day)}`, minutes, ambiguous: false };
      }
    }
  }

  // Numeric: 03/04/2026, 3-4-26, 03.04.2026
  const numeric = text.match(/^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2}|\d{4}))?$/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = numeric[3] ? normaliseYear(Number(numeric[3])) : null;

    const monthFirst = isMonthFirst(options.locale);
    let month = monthFirst ? first : second;
    let day = monthFirst ? second : first;
    // Only one reading can be a real date when a value exceeds 12; take it
    // regardless of locale rather than rejecting something valid.
    let ambiguous = first <= 12 && second <= 12 && first !== second;

    if (month > 12 && day <= 12) {
      [month, day] = [day, month];
      ambiguous = false;
    }

    const resolvedYear = year ?? inferYear(today, month, day);
    if (isRealDate(resolvedYear, month, day)) {
      return { date: `${resolvedYear}-${pad(month)}-${pad(day)}`, minutes, ambiguous };
    }
  }

  return null;
}

/** Two-digit years mean this century. */
function normaliseYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

/**
 * A date with no year means the next time it occurs. Someone saying "14 Aug"
 * in December means next August, not one that has already gone.
 */
function inferYear(today: string, month: number, day: number): number {
  const [currentYear] = today.split('-').map(Number);
  const candidate = `${currentYear}-${pad(month)}-${pad(day)}`;
  return candidate >= today ? currentYear : currentYear + 1;
}
