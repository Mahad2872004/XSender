/**
 * Plans and regional pricing.
 *
 * A single global price would either lose the whole of South Asia or leave
 * money on the table in the GCC and the West. Purchasing-power-adjusted tiers
 * let one product sell in both without pretending they are the same market.
 *
 * The region is a *display* choice here. When Stripe lands, the authority is
 * the customer's billing country, not a guess from their IP — otherwise anyone
 * with a VPN buys at the cheapest tier.
 */

export type RegionId = 'global' | 'south_asia' | 'mena' | 'africa_sea';

export interface Region {
  id: RegionId;
  label: string;
  currency: string;
  /** Countries this applies to, for the billing-country lookup later. */
  countries: string[];
  /** Multiplier against the USD list price, from World Bank PPP data. */
  factor: number;
}

export const REGIONS: Region[] = [
  {
    id: 'global',
    label: 'US, UK, EU & Australia',
    currency: 'USD',
    countries: ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'SG'],
    factor: 1,
  },
  {
    id: 'mena',
    label: 'Middle East',
    currency: 'AED',
    countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'],
    factor: 3.6,
  },
  {
    id: 'south_asia',
    label: 'Pakistan & South Asia',
    currency: 'PKR',
    countries: ['PK', 'IN', 'BD', 'LK', 'NP'],
    factor: 120,
  },
  {
    id: 'africa_sea',
    label: 'Africa & Southeast Asia',
    currency: 'USD',
    countries: ['NG', 'KE', 'EG', 'ZA', 'ID', 'PH', 'VN', 'TH'],
    factor: 0.6,
  },
];

export interface Plan {
  id: 'starter' | 'growth' | 'pro';
  name: string;
  /** Monthly list price in USD. Regional prices derive from this. */
  usd: number;
  tagline: string;
  /** Who it is for, in their own terms. */
  bestFor: string;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    usd: 29,
    tagline: 'One channel, one location',
    bestFor: 'A single shop, clinic or cafe answering its own messages',
    features: [
      '1 connected channel',
      '500 conversations a month',
      'Unlimited flows and templates',
      'Orders and bookings',
      '2 team members',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    usd: 79,
    tagline: 'All three channels, a real team',
    bestFor: 'A busy business with staff sharing an inbox',
    features: [
      'WhatsApp, Instagram and Messenger',
      '3,000 conversations a month',
      'Reminders and follow-ups',
      'Campaigns and broadcasts',
      '5 team members',
      'ROI reporting',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    usd: 199,
    tagline: 'Multiple outlets',
    bestFor: 'Chains and clinics running several locations',
    features: [
      'Unlimited channels',
      '15,000 conversations a month',
      'Unlimited team members',
      'Multiple locations',
      'Priority support',
    ],
  },
];

/** Round to something that looks like a price, not a conversion. */
function tidy(value: number, currency: string): number {
  if (currency === 'USD') return Math.round(value);
  if (value < 1000) return Math.round(value / 5) * 5;
  return Math.round(value / 500) * 500;
}

export function priceFor(plan: Plan, region: Region): string {
  const amount = tidy(plan.usd * region.factor, region.currency);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: region.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Done-for-you onboarding. Priced against the salary it replaces. */
export const SETUP_TIERS = [
  {
    id: 'essentials',
    name: 'Essentials',
    usd: 299,
    summary: 'One channel, one flow, live and working',
    includes: [
      'Discovery call',
      'Your menu or services loaded for you',
      'One automation built and published',
      'WhatsApp connected',
      'First week monitored',
    ],
  },
  {
    id: 'complete',
    name: 'Complete',
    usd: 599,
    summary: 'Every channel, every conversation your business has',
    includes: [
      'Everything in Essentials',
      'All three channels connected',
      'Ordering, booking and FAQ flows',
      'Reminders and follow-ups configured',
      'Team trained on the inbox',
      'First month monitored and tuned',
    ],
    highlighted: true,
  },
  {
    id: 'multi',
    name: 'Multi-outlet',
    usd: 999,
    summary: 'Several locations, one system',
    includes: [
      'Everything in Complete',
      'Up to 5 locations configured',
      'Per-location menus and availability',
      'Reporting set up for your managers',
      'Quarterly review',
    ],
  },
] as const;
