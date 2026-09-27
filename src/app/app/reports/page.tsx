import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { APP } from '@/lib/routes';
import { requireOnboarded } from '@/server/auth/session';
import { loadRoiSummary, periodFor } from '@/server/roi/summary';
import ReportActions from './ReportActions';
import styles from './report.module.css';

export const metadata = { title: 'ROI report · xSender' };

/**
 * The report an owner forwards to whoever holds the budget.
 *
 * Deliberately a document rather than a dashboard: no filters, no hover states,
 * one page, prints cleanly to PDF. The person reading it is often not the person
 * who logs in, so it restates what the numbers mean instead of assuming the
 * product is already understood.
 */
export default async function ReportPage(props: PageProps<'/app/reports'>) {
  const searchParams = await props.searchParams;
  const ctx = await requireOnboarded();

  const requested = Number(typeof searchParams.days === 'string' ? searchParams.days : '30');
  const days = [7, 30, 90].includes(requested) ? requested : 30;

  const summary = await loadRoiSummary(ctx, periodFor(days));
  const locale = ctx.workspace.locale;

  const money = (minor: number) => formatMoney(minor, summary.currency, locale);
  const date = (value: Date | string) =>
    new Date(value).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <Link href={`${APP.dashboard}?days=${days}`} className={styles.back}>
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
        <ReportActions
          csv={toCsv(summary)}
          filename={`xsender-roi-${ctx.workspace.slug}-${days}d.csv`}
        />
      </div>

      <article className={styles.sheet}>
        <header className={styles.sheetHead}>
          <div>
            <p className={styles.kicker}>Automation report</p>
            <h1 className={styles.title}>{ctx.workspace.name}</h1>
          </div>
          <div className={styles.meta}>
            <span>{summary.period.label}</span>
            <span>
              {date(summary.period.from)} – {date(summary.period.to)}
            </span>
          </div>
        </header>

        {summary.isEmpty ? (
          <p className={styles.emptyNote}>
            No customer messages were handled in this period, so there is nothing to report. This
            document counts real conversations only — it does not estimate.
          </p>
        ) : (
          <>
            <section className={styles.headline}>
              <div className={styles.headlineFigure}>
                <span className={styles.headlineValue}>
                  {summary.hoursSaved < 10
                    ? summary.hoursSaved.toFixed(1)
                    : Math.round(summary.hoursSaved).toLocaleString(locale)}
                </span>
                <span className={styles.headlineUnit}>hours of staff time</span>
              </div>
              <p className={styles.headlineBody}>
                That is the time your team did not spend reading and answering customer messages,
                because the automation answered{' '}
                <strong>{summary.turnsAutomated.toLocaleString(locale)}</strong> of them end to end.
                At {money(summary.assumptions.hourlyCostMinor)} an hour it is worth about{' '}
                <strong>{money(summary.moneySavedMinor)}</strong>.
              </p>
            </section>

            <section>
              <h2 className={styles.sectionTitle}>What happened</h2>
              <table className={styles.table}>
                <tbody>
                  <Row
                    label="Customer messages received"
                    value={summary.inboundMessages.toLocaleString(locale)}
                  />
                  <Row
                    label="Answered by the automation, with no person involved"
                    value={summary.turnsAutomated.toLocaleString(locale)}
                  />
                  <Row
                    label="Answered by a member of your team"
                    value={summary.turnsByPerson.toLocaleString(locale)}
                  />
                  <Row
                    label="Share handled automatically"
                    value={
                      summary.automationRate === null
                        ? '—'
                        : `${Math.round(summary.automationRate * 100)}%`
                    }
                  />
                  <Row
                    label="Conversations in total"
                    value={summary.conversationsTotal.toLocaleString(locale)}
                  />
                  <Row
                    label="Conversations that never needed a person"
                    value={summary.conversationsAutomated.toLocaleString(locale)}
                  />
                  <Row
                    label="Deliberately handed to a person"
                    value={summary.handoffs.toLocaleString(locale)}
                  />
                </tbody>
              </table>
            </section>

            <section>
              <h2 className={styles.sectionTitle}>Business captured</h2>
              <table className={styles.table}>
                <tbody>
                  <Row
                    label="Orders taken by the automation"
                    value={summary.ordersCaptured.toLocaleString(locale)}
                  />
                  <Row label="Value of those orders" value={money(summary.ordersValueMinor)} />
                  <Row
                    label="Bookings confirmed by the automation"
                    value={summary.bookingsCaptured.toLocaleString(locale)}
                  />
                </tbody>
              </table>
            </section>

            <section>
              <h2 className={styles.sectionTitle}>How the hours figure is calculated</h2>
              <table className={styles.table}>
                <tbody>
                  <Row
                    label="Customer messages answered automatically"
                    value={summary.turnsAutomated.toLocaleString(locale)}
                  />
                  <Row
                    label="Minutes of staff time assumed per message"
                    value={`${summary.assumptions.minutesPerMessage}`}
                    assumption
                  />
                  <Row
                    label="Hours saved"
                    value={
                      summary.hoursSaved < 10
                        ? summary.hoursSaved.toFixed(1)
                        : Math.round(summary.hoursSaved).toLocaleString(locale)
                    }
                  />
                  <Row
                    label="Assumed cost of one hour"
                    value={money(summary.assumptions.hourlyCostMinor)}
                    assumption
                  />
                  <Row label="Money not spent on wages" value={money(summary.moneySavedMinor)} total />
                </tbody>
              </table>

              <p className={styles.note}>
                <strong>What is counted.</strong> A &ldquo;message answered&rdquo; is one inbound
                customer message and everything sent back before that customer wrote again. Counting
                it this way avoids inflating the total: the automation often replies in several
                messages where a person would type one.
              </p>
              <p className={styles.note}>
                <strong>What is assumed.</strong> Only the two rows marked above. Everything else is
                a count of records in this account.
              </p>
              <p className={styles.note}>
                <strong>What is not counted.</strong> Revenue from customers who would have given up
                waiting for a reply, out-of-hours enquiries that would otherwise have gone
                unanswered, and the value of your team&apos;s attention going somewhere else. All
                real, none of it measurable from this data, so none of it is claimed here.
              </p>
            </section>
          </>
        )}

        <footer className={styles.sheetFoot}>
          Generated {date(new Date())} from {ctx.workspace.name}&apos;s own conversation records ·
          xSender
        </footer>
      </article>
    </div>
  );
}

function Row({
  label,
  value,
  assumption,
  total,
}: {
  label: string;
  value: string;
  assumption?: boolean;
  total?: boolean;
}) {
  return (
    <tr className={total ? styles.rowTotal : undefined}>
      <th scope="row" className={styles.rowLabel}>
        {label}
        {assumption && <span className={styles.assumptionTag}>assumption</span>}
      </th>
      <td className={styles.rowValue}>{value}</td>
    </tr>
  );
}

/** Daily figures as CSV, for anyone who wants to check the arithmetic. */
function toCsv(summary: {
  daily: Array<{ day: string; turnsAutomated: number; turnsByPerson: number }>;
}): string {
  const header = 'date,answered_by_automation,answered_by_person';
  const rows = summary.daily.map(
    (d) => `${d.day},${d.turnsAutomated},${d.turnsByPerson}`
  );
  return [header, ...rows].join('\n');
}
