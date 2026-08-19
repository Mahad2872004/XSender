/**
 * Timezone arithmetic, using the IANA data the platform already ships.
 *
 * Why this exists: JavaScript's Date methods (`setHours`, `getDay`) resolve
 * against the *server's* timezone. That is invisible while the server and the
 * business share a zone, and silently wrong the moment they don't — a Karachi
 * restaurant's "12:00–23:00" opening hours become 17:00–04:00 local when the
 * server runs on UTC. No error is thrown; the times are simply wrong.
 *
 * Everything is stored as UTC (`timestamptz`) and interpreted in the
 * workspace's zone at the edges. No dependency: `Intl` carries the full tz
 * database, including historical and future DST rules.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    FORMATTERS.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock parts an observer in `timeZone` would read at `instant`. */
export function zonedParts(timeZone: string, instant: Date): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  // Some ICU builds render midnight as hour 24 under hour12:false.
  const hour = value('hour') % 24;

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour,
    minute: value('minute'),
    second: value('second'),
  };
}

/**
 * Offset in milliseconds between `timeZone` and UTC at a given instant.
 * Positive east of Greenwich. Varies across DST transitions, which is why it
 * takes an instant rather than being a constant per zone.
 */
export function offsetMs(timeZone: string, instant: Date): number {
  const parts = zonedParts(timeZone, instant);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  // formatToParts has no milliseconds, so compare at second resolution.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The UTC instant at which the given wall-clock time occurs in `timeZone`.
 *
 * Two passes: the offset is looked up at a guessed instant, and near a DST
 * transition the corrected instant can fall on the other side of the boundary
 * with a different offset. A second pass settles it.
 *
 * A wall-clock time that never happens (the hour skipped when clocks spring
 * forward) resolves to the instant just before the gap rather than throwing.
 * Slot labels are rendered back from the returned instant, so the offer stays
 * self-consistent — and a customer choosing a time should never meet an error.
 */
export function zonedTimeToUtc(
  timeZone: string,
  parts: { year: number; month: number; day: number; hour?: number; minute?: number }
): Date {
  const wallClock = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0
  );

  const firstPass = wallClock - offsetMs(timeZone, new Date(wallClock));
  const secondPass = wallClock - offsetMs(timeZone, new Date(firstPass));

  return new Date(secondPass);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/** 0 = Sunday, matching PostgreSQL's extract(dow) and availability_rules. */
export function zonedWeekday(timeZone: string, instant: Date): number {
  let formatter = WEEKDAY_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
    WEEKDAY_FORMATTERS.set(timeZone, formatter);
  }
  return WEEKDAYS.indexOf(formatter.format(instant));
}

/** Calendar date in `timeZone` as YYYY-MM-DD. */
export function zonedDateString(timeZone: string, instant: Date): string {
  const { year, month, day } = zonedParts(timeZone, instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse YYYY-MM-DD into its numeric parts, without touching Date. */
export function parseDateString(
  date: string
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

/** Midnight, in `timeZone`, on the given calendar date — as a UTC instant. */
export function startOfZonedDay(timeZone: string, date: string): Date | null {
  const parts = parseDateString(date);
  if (!parts) return null;
  return zonedTimeToUtc(timeZone, { ...parts, hour: 0, minute: 0 });
}

/** Add whole days to a YYYY-MM-DD string without timezone drift. */
export function addDaysToDateString(date: string, days: number): string {
  const parts = parseDateString(date);
  if (!parts) return date;

  // Date.UTC is safe here: this is calendar arithmetic on a fixed grid, with
  // no local-time interpretation involved.
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return shifted.toISOString().slice(0, 10);
}

/** Minutes past midnight from a 'HH:MM' or 'HH:MM:SS' string. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/** Format an instant in a workspace's zone and locale. */
export function formatInZone(
  instant: Date,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(instant);
}

/** Is this a timezone identifier the runtime recognises? */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}
