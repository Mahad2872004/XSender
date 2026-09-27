import type { Json, RoiDailyRow, RoiSummaryRow } from '@/lib/database.types';
import { minorPerMajor } from '@/lib/money';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * The ROI figure, computed from what actually happened.
 *
 * Every count here comes from a row that exists because a real customer sent a
 * real message. Nothing is seeded, estimated or extrapolated. There is exactly
 * one assumption — how long a person takes to answer one customer — and it is
 * surfaced on the screen as an editable input rather than buried in this file,
 * because an owner who cannot see the assumption has no reason to believe the
 * conclusion.
 */

/** How the hero number is allowed to be spent. */
export interface RoiAssumptions {
  /**
   * Minutes a member of staff spends handling one customer message, including
   * the cost of being interrupted.
   */
  minutesPerMessage: number;
  /** What an hour of that person's time costs, in the workspace's currency. */
  hourlyCostMinor: number;
}

/**
 * Three minutes, deliberately low.
 *
 * Reading a message, checking a price or a diary, typing a reply and coming back
 * to what you were doing is comfortably more than three minutes in most
 * businesses. A number the owner can beat in practice is worth more than one
 * they can argue with.
 */
export const DEFAULT_MINUTES_PER_MESSAGE = 3;

export const MIN_MINUTES_PER_MESSAGE = 0.5;
export const MAX_MINUTES_PER_MESSAGE = 20;

/** Rough hourly cost of a junior support person, by currency. Editable. */
const DEFAULT_HOURLY_COST_MAJOR: Record<string, number> = {
  PKR: 350,
  INR: 250,
  USD: 18,
  EUR: 18,
  GBP: 15,
  AED: 45,
  SAR: 45,
  NGN: 3000,
  KES: 600,
  ZAR: 90,
  BDT: 250,
  IDR: 45_000,
  PHP: 150,
  BRL: 30,
};

export function defaultAssumptions(currency: string): RoiAssumptions {
  const major = DEFAULT_HOURLY_COST_MAJOR[currency.toUpperCase()] ?? 15;
  return {
    minutesPerMessage: DEFAULT_MINUTES_PER_MESSAGE,
    hourlyCostMinor: Math.round(major * minorPerMajor(currency)),
  };
}

/** Read the workspace's assumptions, falling back to the currency default. */
export function readAssumptions(
  settings: Json | null,
  currency: string
): { assumptions: RoiAssumptions; isDefault: boolean } {
  const fallback = defaultAssumptions(currency);
  const stored =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>).roi
      : null;

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { assumptions: fallback, isDefault: true };
  }

  const bag = stored as Record<string, unknown>;
  const minutes = Number(bag.minutesPerMessage);
  const hourly = Number(bag.hourlyCostMinor);

  return {
    assumptions: {
      minutesPerMessage: clampMinutes(Number.isFinite(minutes) ? minutes : fallback.minutesPerMessage),
      hourlyCostMinor:
        Number.isFinite(hourly) && hourly >= 0 ? Math.round(hourly) : fallback.hourlyCostMinor,
    },
    isDefault: false,
  };
}

export function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MINUTES_PER_MESSAGE;
  return Math.min(MAX_MINUTES_PER_MESSAGE, Math.max(MIN_MINUTES_PER_MESSAGE, value));
}

/**
 * Persist the assumptions.
 *
 * Merged into settings rather than replacing it, so saving an ROI assumption
 * cannot wipe business hours or branding stored alongside it.
 */
export async function saveAssumptions(
  ctx: WorkspaceContext,
  next: RoiAssumptions
): Promise<void> {
  ctx.requireRole('admin');

  const existing =
    ctx.workspace.settings && typeof ctx.workspace.settings === 'object' && !Array.isArray(ctx.workspace.settings)
      ? (ctx.workspace.settings as Record<string, unknown>)
      : {};

  const { error } = await ctx.db
    .from('workspaces')
    .update({
      settings: {
        ...existing,
        roi: {
          minutesPerMessage: clampMinutes(next.minutesPerMessage),
          hourlyCostMinor: Math.max(0, Math.round(next.hourlyCostMinor)),
        },
      } as Json,
    })
    .eq('id', ctx.workspaceId);

  if (error) throw new Error(`Could not save the ROI assumptions: ${error.message}`);
}

export interface RoiPeriod {
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  days: number;
  label: string;
}

export interface RoiSummary {
  period: RoiPeriod;
  currency: string;
  assumptions: RoiAssumptions;
  /** True while the owner has not changed the defaults, so the UI can say so. */
  assumptionsAreDefault: boolean;

  /** Customer messages the automation answered end to end. The hero input. */
  turnsAutomated: number;
  /** Customer messages a person answered. */
  turnsByPerson: number;
  inboundMessages: number;
  outboundBotMessages: number;

  conversationsTotal: number;
  conversationsAutomated: number;
  handoffs: number;

  ordersCaptured: number;
  ordersValueMinor: number;
  bookingsCaptured: number;

  /** turnsAutomated × minutesPerMessage ÷ 60. */
  hoursSaved: number;
  /** hoursSaved × hourly cost, in minor units of the workspace currency. */
  moneySavedMinor: number;
  /** Share of answered messages the automation handled. Null when none yet. */
  automationRate: number | null;
  /** Full days of one person's time, at 8 hours a day. */
  workingDaysSaved: number;

  firstActivityAt: string | null;
  /** True when nothing has happened yet, so the screen can say so honestly. */
  isEmpty: boolean;

  daily: Array<{ day: string; turnsAutomated: number; turnsByPerson: number }>;
}

/** Whole days back from now, in UTC — the period the dashboard's picker offers. */
export function periodFor(days: number): RoiPeriod {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from,
    to,
    days,
    label: days === 1 ? 'Last 24 hours' : `Last ${days} days`,
  };
}

export async function loadRoiSummary(
  ctx: WorkspaceContext,
  period: RoiPeriod
): Promise<RoiSummary> {
  const currency = ctx.workspace.currency;
  const { assumptions, isDefault } = readAssumptions(ctx.workspace.settings, currency);

  // Two aggregations, run together: the headline and the trend line. Each is one
  // round trip, which matters at ~265ms apiece.
  const [summaryResult, dailyResult] = await Promise.all([
    ctx.db.rpc('roi_summary', {
      p_workspace: ctx.workspaceId,
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
    }),
    ctx.db.rpc('roi_daily', {
      p_workspace: ctx.workspaceId,
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_timezone: ctx.workspace.timezone,
    }),
  ]);

  if (summaryResult.error) {
    throw new Error(`Could not load the ROI summary: ${summaryResult.error.message}`);
  }

  // A set-returning function comes back as an array even though it yields one
  // row; an empty workspace yields none at all.
  const row = (summaryResult.data as RoiSummaryRow[] | null)?.[0] ?? null;

  const turnsAutomated = num(row?.turns_automated);
  const turnsByPerson = num(row?.turns_by_person);
  const answered = turnsAutomated + turnsByPerson;

  const hoursSaved = (turnsAutomated * assumptions.minutesPerMessage) / 60;

  return {
    period,
    currency,
    assumptions,
    assumptionsAreDefault: isDefault,

    turnsAutomated,
    turnsByPerson,
    inboundMessages: num(row?.inbound_messages),
    outboundBotMessages: num(row?.outbound_bot_messages),

    conversationsTotal: num(row?.conversations_total),
    conversationsAutomated: num(row?.conversations_automated),
    handoffs: num(row?.handoffs),

    ordersCaptured: num(row?.orders_captured),
    ordersValueMinor: num(row?.orders_value_minor),
    bookingsCaptured: num(row?.bookings_captured),

    hoursSaved,
    moneySavedMinor: Math.round(hoursSaved * assumptions.hourlyCostMinor),
    automationRate: answered > 0 ? turnsAutomated / answered : null,
    workingDaysSaved: hoursSaved / 8,

    firstActivityAt: row?.first_activity_at ?? null,
    isEmpty: num(row?.inbound_messages) === 0,

    daily: fillDays(
      period,
      ((dailyResult.data as RoiDailyRow[] | null) ?? []).map((d) => ({
        day: d.day,
        turnsAutomated: num(d.turns_automated),
        turnsByPerson: num(d.turns_by_person),
      })),
      ctx.workspace.timezone
    ),
  };
}

/**
 * Fill in the days nothing happened.
 *
 * Without this a week with two busy days renders as two bars side by side, which
 * reads as constant activity. A quiet Sunday is information.
 */
function fillDays(
  period: RoiPeriod,
  rows: Array<{ day: string; turnsAutomated: number; turnsByPerson: number }>,
  timezone: string
): Array<{ day: string; turnsAutomated: number; turnsByPerson: number }> {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: Array<{ day: string; turnsAutomated: number; turnsByPerson: number }> = [];

  // Capped: a year of daily bars is unreadable anyway, and the chart aggregates
  // longer periods elsewhere.
  const days = Math.min(period.days, 90);

  for (let i = days - 1; i >= 0; i -= 1) {
    const at = new Date(period.to.getTime() - i * 24 * 60 * 60 * 1000);
    const key = isoDateIn(at, timezone);
    out.push(byDay.get(key) ?? { day: key, turnsAutomated: 0, turnsByPerson: 0 });
  }

  return out;
}

/** The calendar date at an instant, in a named timezone — matching roi_daily. */
function isoDateIn(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
  // en-CA formats as YYYY-MM-DD, which is what Postgres returns for a date.
  return parts;
}

/** PostgREST returns bigint as a string; coerce rather than trust the type. */
function num(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}
