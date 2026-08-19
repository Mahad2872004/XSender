'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PUBLIC } from '@/lib/routes';
import { PLANS, REGIONS, priceFor, type RegionId } from '@/lib/pricing';
import styles from './pricing.module.css';

/**
 * Plans with a region switcher.
 *
 * The switcher is deliberately visible rather than silently geo-detected: a
 * Pakistani buyer seeing $79 bounces before they find the local price, and a
 * US buyer who spots a hidden cheaper tier loses trust. Showing the tiers
 * openly is the honest version and converts better in both directions.
 */
export default function PricingTable() {
  const [regionId, setRegionId] = useState<RegionId>('global');
  const region = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0];

  return (
    <>
      <div className={styles.regionSwitch} role="group" aria-label="Choose your region">
        {REGIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === regionId ? styles.regionActive : styles.regionButton}
            onClick={() => setRegionId(option.id)}
            aria-pressed={option.id === regionId}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.planGrid}>
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={plan.highlighted ? styles.planCardFeatured : styles.planCard}
          >
            {plan.highlighted && <span className={styles.planBadge}>Most chosen</span>}

            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planTagline}>{plan.tagline}</p>

            <p className={styles.planPrice}>
              {priceFor(plan, region)}
              <span className={styles.planPer}>/month</span>
            </p>

            <p className={styles.planBestFor}>{plan.bestFor}</p>

            <ul className={styles.planFeatures}>
              {plan.features.map((feature) => (
                <li key={feature} className={styles.planFeature}>
                  <Check size={16} className={styles.planCheck} />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={PUBLIC.signup}
              className={plan.highlighted ? styles.planCtaPrimary : styles.planCta}
              data-cta={`pricing-${plan.id}`}
            >
              Start free
            </Link>
          </article>
        ))}
      </div>

      <p className={styles.planFootnote}>
        Prices shown for <strong>{region.label}</strong>. Your billing country decides
        which applies. 14-day free trial on every plan — no card until you are ready.
      </p>
    </>
  );
}
