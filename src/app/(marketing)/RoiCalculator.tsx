'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics';
import { formatMoney, minorPerMajor } from '@/lib/money';
import { REGIONS, type RegionId } from '@/lib/pricing';
import { PUBLIC } from '@/lib/routes';
import { calculateRoi } from '@/lib/roi';
import styles from './roi.module.css';

/**
 * The visitor's own numbers, not ours.
 *
 * A claim like "save 20 hours a month" is dismissed; the same figure derived
 * from what they just typed is not. Meta's charge is subtracted openly, because
 * a calculator that only shows upside stops being believed the moment anyone
 * checks it.
 */

const DEFAULTS: Record<RegionId, { hourlyCost: number; messagesPerDay: number }> = {
  global: { hourlyCost: 18, messagesPerDay: 60 },
  mena: { hourlyCost: 45, messagesPerDay: 60 },
  south_asia: { hourlyCost: 400, messagesPerDay: 80 },
  africa_sea: { hourlyCost: 6, messagesPerDay: 60 },
};

export default function RoiCalculator() {
  const [region, setRegion] = useState<RegionId>('global');
  const [messagesPerDay, setMessagesPerDay] = useState(DEFAULTS.global.messagesPerDay);
  const [minutesPerMessage, setMinutesPerMessage] = useState(3);
  const [hourlyCost, setHourlyCost] = useState(DEFAULTS.global.hourlyCost);

  // Switching region should reset the money inputs — 18 is a sensible hourly
  // wage in dollars and a nonsensical one in rupees.
  function changeRegion(next: RegionId) {
    setRegion(next);
    setHourlyCost(DEFAULTS[next].hourlyCost);
    setMessagesPerDay(DEFAULTS[next].messagesPerDay);
  }

  const result = useMemo(
    () => calculateRoi({ messagesPerDay, minutesPerMessage, hourlyCost, region }),
    [messagesPerDay, minutesPerMessage, hourlyCost, region]
  );

  // Report once the visitor has actually engaged, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      track('roi_calculated', {
        region,
        messagesPerDay,
        netSaving: result.netSavingPerMonth,
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [region, messagesPerDay, minutesPerMessage, hourlyCost, result.netSavingPerMonth]);

  const money = (major: number) =>
    formatMoney(Math.round(major * minorPerMajor(result.currency)), result.currency, 'en-US');

  const worthwhile = result.netSavingPerMonth > 0;

  return (
    <div className={styles.calculator}>
      <div className={styles.inputs}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="roi-region">
            Where are you?
          </label>
          <select
            id="roi-region"
            className={styles.select}
            value={region}
            onChange={(e) => changeRegion(e.target.value as RegionId)}
          >
            {REGIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="roi-messages">
            Customer messages a day
            <span className={styles.value}>{messagesPerDay}</span>
          </label>
          <input
            id="roi-messages"
            type="range"
            min={10}
            max={500}
            step={10}
            value={messagesPerDay}
            onChange={(e) => setMessagesPerDay(Number(e.target.value))}
            className={styles.range}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="roi-minutes">
            Minutes to handle one
            <span className={styles.value}>{minutesPerMessage}</span>
          </label>
          <input
            id="roi-minutes"
            type="range"
            min={1}
            max={10}
            step={1}
            value={minutesPerMessage}
            onChange={(e) => setMinutesPerMessage(Number(e.target.value))}
            className={styles.range}
          />
          <span className={styles.hint}>Including the interruption, not just the typing.</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="roi-cost">
            Cost of an hour of that time
          </label>
          <input
            id="roi-cost"
            type="number"
            min={0}
            value={hourlyCost}
            onChange={(e) => setHourlyCost(Number(e.target.value))}
            className={styles.number}
          />
          <span className={styles.hint}>
            Wages plus the share of overheads you carry, in {result.currency}.
          </span>
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.headline}>
          <span className={styles.headlineLabel}>You would save about</span>
          <span className={worthwhile ? styles.headlineValue : styles.headlineValueMuted}>
            {money(Math.max(0, result.netSavingPerMonth))}
          </span>
          <span className={styles.headlineUnit}>a month, after paying for everything</span>
        </div>

        <dl className={styles.breakdown}>
          <div className={styles.row}>
            <dt>Messages handled without a person</dt>
            <dd>{result.messagesAutomatedPerMonth.toLocaleString()}</dd>
          </div>
          <div className={styles.row}>
            <dt>Staff time returned</dt>
            <dd>{result.hoursSavedPerMonth} hours</dd>
          </div>
          <div className={styles.row}>
            <dt>That time is worth</dt>
            <dd>{money(result.grossSavingPerMonth)}</dd>
          </div>
          <div className={styles.rowCost}>
            <dt>xSender {result.planName}</dt>
            <dd>−{money(result.planCostPerMonth)}</dd>
          </div>
          <div className={styles.rowCost}>
            <dt>
              Meta messaging <span className={styles.badge}>paid to Meta, not us</span>
            </dt>
            <dd>−{money(result.metaCostPerMonth)}</dd>
          </div>
        </dl>

        {worthwhile && result.paybackDays !== null && (
          <p className={styles.payback}>
            It pays for itself in about <strong>{result.paybackDays} days</strong>
            {result.roiMultiple !== null && <> — around {result.roiMultiple}× what it costs.</>}
          </p>
        )}

        {!worthwhile && (
          <p className={styles.payback}>
            At this volume the numbers are close. xSender is worth more once you are
            handling enough messages that someone is tied up answering them.
          </p>
        )}

        <Link href={PUBLIC.signup} className={styles.cta} data-cta="roi-signup">
          Start free — no card
          <ArrowRight size={17} />
        </Link>

        <p className={styles.assumptions}>
          Assumes xSender resolves {Math.round(result.automationRate * 100)}% of messages
          end to end, which is deliberately conservative. Meta&rsquo;s charge varies by
          country and is billed to you directly.
        </p>
      </div>
    </div>
  );
}
