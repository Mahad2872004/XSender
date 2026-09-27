'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  Clock,
  FileText,
  MessageSquare,
  Plug,
  ShoppingBag,
  Sliders,
  UserRound,
} from 'lucide-react';
import { formatMoney, minorPerMajor } from '@/lib/money';
import { APP } from '@/lib/routes';
import type { RoiSummary } from '@/server/roi/summary';
import { saveAssumptionsAction } from './actions';
import { EMPTY_ASSUMPTION_STATE } from './form-state';
import styles from './page.module.css';

/**
 * The ROI dashboard.
 *
 * This is the screen the product is sold on, so it is built to do one thing:
 * hand the owner proof. One number dominates — hours their team did not have to
 * spend — and everything below it exists to make that number checkable rather
 * than impressive. The arithmetic is written out in full near the bottom, the
 * single assumption behind it is editable in place, and a period with no
 * activity says so plainly instead of showing a confident zero.
 */

const PERIODS = [7, 30, 90] as const;

export default function RoiDashboard({
  summary,
  workspaceName,
  locale,
  canEdit,
  hasLiveChannel,
}: {
  summary: RoiSummary;
  workspaceName: string;
  locale: string;
  canEdit: boolean;
  hasLiveChannel: boolean;
}) {
  const [tuning, setTuning] = useState(false);

  return (
    <div className={styles.page}>
      <header className={styles.topRow}>
        <div>
          <h1 className={styles.pageTitle}>What xSender did for {workspaceName}</h1>
          <p className={styles.pageSub}>
            Counted from real conversations — not estimates, projections or sample data.
          </p>
        </div>

        <div className={styles.topActions}>
          <nav className={styles.periods} aria-label="Reporting period">
            {PERIODS.map((days) => (
              <Link
                key={days}
                href={`${APP.dashboard}?days=${days}`}
                className={`${styles.periodTab} ${
                  summary.period.days === days ? styles.periodTabOn : ''
                }`}
              >
                {days}d
              </Link>
            ))}
          </nav>

          <Link href={`${APP.reports}?days=${summary.period.days}`} className={styles.reportBtn}>
            <FileText size={15} />
            Report
          </Link>
        </div>
      </header>

      {summary.isEmpty ? (
        <EmptyHero hasLiveChannel={hasLiveChannel} />
      ) : (
        <>
          {/* ---------- The hero. Nothing else on this screen competes. ---------- */}
          <section className={styles.hero}>
            <div className={styles.heroMain}>
              <span className={styles.heroLabel}>Staff time given back</span>
              <p className={styles.heroNumber}>
                {formatHours(summary.hoursSaved)}
                <span className={styles.heroUnit}>
                  {summary.hoursSaved === 1 ? 'hour' : 'hours'}
                </span>
              </p>
              <p className={styles.heroCaption}>
                {summary.period.label.toLowerCase()} · the same as{' '}
                <strong>{formatDays(summary.workingDaysSaved)}</strong> of one person&apos;s working
                days
              </p>
            </div>

            <div className={styles.heroAside}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Worth roughly</span>
                <span className={styles.heroStatValue}>
                  {formatMoney(summary.moneySavedMinor, summary.currency, locale)}
                </span>
                <span className={styles.heroStatNote}>in wages not spent on typing replies</span>
              </div>

              {summary.automationRate !== null && (
                <div className={styles.heroStat}>
                  <span className={styles.heroStatLabel}>Handled without a person</span>
                  <span className={styles.heroStatValue}>
                    {Math.round(summary.automationRate * 100)}%
                  </span>
                  <span className={styles.heroStatNote}>
                    of every customer message answered
                  </span>
                </div>
              )}
            </div>

            {/* The assumption, on the hero itself. Hiding it in settings would
                make the big number look like a claim rather than a calculation. */}
            <div className={styles.assumption}>
              <Sliders size={13} />
              <span>
                Assumes <strong>{summary.assumptions.minutesPerMessage} minutes</strong> of a
                person&apos;s time per customer message
                {summary.assumptionsAreDefault ? ' (our conservative default)' : ''}, at{' '}
                <strong>
                  {formatMoney(summary.assumptions.hourlyCostMinor, summary.currency, locale)}
                </strong>{' '}
                an hour.
              </span>
              {canEdit && (
                <button
                  type="button"
                  className={styles.assumptionBtn}
                  onClick={() => setTuning((open) => !open)}
                  aria-expanded={tuning}
                >
                  Change this
                  <ChevronDown size={13} className={tuning ? styles.chevronOpen : ''} />
                </button>
              )}
            </div>

            {tuning && canEdit && (
              <AssumptionForm summary={summary} onDone={() => setTuning(false)} />
            )}
          </section>

          {/* ---------- The countable things ---------- */}
          <section className={styles.proofGrid}>
            <ProofCard
              icon={<MessageSquare size={17} />}
              value={summary.turnsAutomated.toLocaleString(locale)}
              label="Customer messages answered automatically"
              note={`${summary.inboundMessages.toLocaleString(locale)} came in altogether`}
            />
            <ProofCard
              icon={<ShoppingBag size={17} />}
              value={summary.ordersCaptured.toLocaleString(locale)}
              label="Orders taken by the automation"
              note={
                summary.ordersValueMinor > 0
                  ? `${formatMoney(summary.ordersValueMinor, summary.currency, locale)} in value`
                  : 'No order value recorded yet'
              }
            />
            <ProofCard
              icon={<CalendarCheck size={17} />}
              value={summary.bookingsCaptured.toLocaleString(locale)}
              label="Bookings confirmed by the automation"
              note="Slot checked and held without anyone looking at a diary"
            />
            <ProofCard
              icon={<UserRound size={17} />}
              value={summary.turnsByPerson.toLocaleString(locale)}
              label="Messages that still needed a person"
              note={
                summary.handoffs > 0
                  ? `${summary.handoffs.toLocaleString(locale)} handed over on purpose`
                  : 'Nothing was handed over'
              }
            />
          </section>

          <DailyChart summary={summary} locale={locale} />

          {/* ---------- The arithmetic, in full ---------- */}
          <section className={styles.workings}>
            <h2 className={styles.workingsTitle}>How that number is worked out</h2>
            <p className={styles.workingsIntro}>
              Every figure below is a count of rows in your account. The only thing we assume is the
              third line, and you can change it above.
            </p>

            <ol className={styles.workingsList}>
              <WorkingRow
                step="Customer messages the automation answered, start to finish"
                value={summary.turnsAutomated.toLocaleString(locale)}
                note="One customer message plus everything the bot sent back before they wrote again. Counted this way on purpose: the bot often replies in three bubbles where a person would type one, and counting those separately would inflate this by three times."
              />
              <WorkingRow
                step="Minutes a person would have spent on each"
                value={`${summary.assumptions.minutesPerMessage} min`}
                note="The one assumption here. Reading the message, checking a price or a diary, typing a reply, and getting back to what you were doing."
                assumed
              />
              <WorkingRow
                step="Time that adds up to"
                value={`${formatHours(summary.hoursSaved)} hours`}
                note={`${summary.turnsAutomated.toLocaleString(locale)} × ${summary.assumptions.minutesPerMessage} ÷ 60`}
              />
              <WorkingRow
                step="At your stated hourly cost"
                value={formatMoney(summary.assumptions.hourlyCostMinor, summary.currency, locale)}
                note="What one hour of the person who would otherwise be replying costs you."
                assumed
              />
              <WorkingRow
                step="Money not spent on that work"
                value={formatMoney(summary.moneySavedMinor, summary.currency, locale)}
                note="Wages only. It does not count orders you would have lost to a slow reply, which is real but not something we can count honestly."
                total
              />
            </ol>

            {summary.firstActivityAt && (
              <p className={styles.workingsFoot}>
                Your first customer message arrived{' '}
                {new Date(summary.firstActivityAt).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                . This page shows {summary.period.label.toLowerCase()}.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function EmptyHero({ hasLiveChannel }: { hasLiveChannel: boolean }) {
  return (
    <section className={styles.emptyHero}>
      <Clock size={26} className={styles.emptyIcon} />
      <h2 className={styles.emptyTitle}>No hours saved yet</h2>
      <p className={styles.emptyBody}>
        {hasLiveChannel
          ? 'Your number is connected, so this fills in the moment a customer messages it. Nothing here is estimated — until there is a real conversation, there is nothing to show.'
          : 'This page counts real conversations, so it stays empty until there are some. Connect the WhatsApp number your customers already message, publish a flow, and the figure appears on its own.'}
      </p>
      <div className={styles.emptyActions}>
        {!hasLiveChannel && (
          <Link href={APP.channels} className={styles.emptyPrimary}>
            <Plug size={15} />
            Connect WhatsApp
          </Link>
        )}
        <Link href={APP.simulator} className={styles.emptySecondary}>
          Try a flow in the Simulator
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

function ProofCard({
  icon,
  value,
  label,
  note,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  note: string;
}) {
  return (
    <div className={styles.proofCard}>
      <span className={styles.proofIcon}>{icon}</span>
      <span className={styles.proofValue}>{value}</span>
      <span className={styles.proofLabel}>{label}</span>
      <span className={styles.proofNote}>{note}</span>
    </div>
  );
}

function WorkingRow({
  step,
  value,
  note,
  assumed,
  total,
}: {
  step: string;
  value: string;
  note: string;
  assumed?: boolean;
  total?: boolean;
}) {
  return (
    <li className={`${styles.workingRow} ${total ? styles.workingRowTotal : ''}`}>
      <div className={styles.workingText}>
        <span className={styles.workingStep}>
          {step}
          {assumed && <span className={styles.assumedTag}>assumption</span>}
        </span>
        <span className={styles.workingNote}>{note}</span>
      </div>
      <span className={styles.workingValue}>{value}</span>
    </li>
  );
}

/**
 * Daily activity, bot against person.
 *
 * Plain CSS bars rather than a charting library: the shape is the only thing
 * being communicated, and 40KB of JavaScript to draw twelve rectangles would
 * make the most important screen in the product the slowest.
 */
function DailyChart({ summary, locale }: { summary: RoiSummary; locale: string }) {
  const peak = Math.max(
    1,
    ...summary.daily.map((d) => d.turnsAutomated + d.turnsByPerson)
  );

  return (
    <section className={styles.chartCard}>
      <div className={styles.chartHead}>
        <h2 className={styles.chartTitle}>Day by day</h2>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <i className={styles.swatchBot} />
            Automation
          </span>
          <span className={styles.legendItem}>
            <i className={styles.swatchPerson} />
            Your team
          </span>
        </div>
      </div>

      <div className={styles.chart} role="img" aria-label="Customer messages handled each day">
        {summary.daily.map((day) => {
          const total = day.turnsAutomated + day.turnsByPerson;
          return (
            <div key={day.day} className={styles.chartCol} title={`${day.day}: ${total} handled`}>
              <div className={styles.chartStack}>
                {day.turnsByPerson > 0 && (
                  <div
                    className={styles.barPerson}
                    style={{ height: `${(day.turnsByPerson / peak) * 100}%` }}
                  />
                )}
                {day.turnsAutomated > 0 && (
                  <div
                    className={styles.barBot}
                    style={{ height: `${(day.turnsAutomated / peak) * 100}%` }}
                  />
                )}
                {total === 0 && <div className={styles.barEmpty} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.chartAxis}>
        <span>{shortDate(summary.daily[0]?.day, locale)}</span>
        <span>{shortDate(summary.daily.at(-1)?.day, locale)}</span>
      </div>
    </section>
  );
}

function AssumptionForm({ summary, onDone }: { summary: RoiSummary; onDone: () => void }) {
  const [state, submit, pending] = useActionState(
    saveAssumptionsAction,
    EMPTY_ASSUMPTION_STATE
  );

  const hourlyMajor = summary.assumptions.hourlyCostMinor / minorPerMajor(summary.currency);

  return (
    <form action={submit} className={styles.tuneForm}>
      <label className={styles.tuneField}>
        <span className={styles.tuneLabel}>Minutes per customer message</span>
        <input
          type="number"
          name="minutesPerMessage"
          defaultValue={summary.assumptions.minutesPerMessage}
          step="0.5"
          min="0.5"
          max="20"
          className={styles.tuneInput}
        />
      </label>

      <label className={styles.tuneField}>
        <span className={styles.tuneLabel}>Cost of an hour ({summary.currency})</span>
        <input
          type="number"
          name="hourlyCostMajor"
          defaultValue={hourlyMajor}
          step="1"
          min="0"
          className={styles.tuneInput}
        />
      </label>

      <button type="submit" className={styles.tuneSave} disabled={pending}>
        {state.saved ? <Check size={14} /> : null}
        {pending ? 'Saving…' : state.saved ? 'Saved' : 'Recalculate'}
      </button>

      <button type="button" className={styles.tuneCancel} onClick={onDone}>
        Close
      </button>

      {state.error && <p className={styles.tuneError}>{state.error}</p>}
    </form>
  );
}

/* ----------------------------------------------------------------- format */

/** One decimal while the number is small enough for it to mean something. */
function formatHours(hours: number): string {
  if (hours === 0) return '0';
  if (hours < 10) return hours.toFixed(1);
  return Math.round(hours).toLocaleString();
}

function formatDays(days: number): string {
  if (days < 1) return `${Math.round(days * 8)} hours`;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)}`;
}

function shortDate(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  // Parsed as a plain date, not an instant: roi_daily already bucketed these in
  // the workspace's timezone, so re-interpreting them as UTC would shift them.
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}
