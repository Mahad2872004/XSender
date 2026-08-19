import { REGIONS, type RegionId } from './pricing';

/**
 * The saving calculation behind the homepage calculator.
 *
 * Kept honest on purpose. Every assumption is a named input the visitor can
 * change, the automation rate is deliberately conservative, and Meta's own
 * charge is subtracted rather than quietly ignored — a calculator that only
 * counts the upside gets checked once and disbelieved forever.
 */

export interface RoiInputs {
  /** Customer messages received per day, across all channels. */
  messagesPerDay: number;
  /** Minutes a person spends handling one, including the interruption. */
  minutesPerMessage: number;
  /** What an hour of that person's time costs, in the region's currency. */
  hourlyCost: number;
  region: RegionId;
}

export interface RoiResult {
  currency: string;
  /** Share of messages the automation handles without a human. */
  automationRate: number;
  messagesAutomatedPerMonth: number;
  hoursSavedPerMonth: number;
  /** Value of that time, in major currency units. */
  grossSavingPerMonth: number;
  /** What xSender costs on the plan this volume needs. */
  planCostPerMonth: number;
  planName: string;
  /** Estimated Meta conversation charges — their bill, not ours. */
  metaCostPerMonth: number;
  netSavingPerMonth: number;
  /** Net saving divided by total cost. Null when nothing is being spent. */
  roiMultiple: number | null;
  paybackDays: number | null;
}

/**
 * Share of inbound messages a scripted flow resolves end to end.
 *
 * Held at 70% deliberately. Real deployments in this category run higher, but
 * a number a prospect can beat in practice is worth more than one they cannot.
 */
const AUTOMATION_RATE = 0.7;

const DAYS_PER_MONTH = 30;

/**
 * Meta's per-conversation charge, in USD, roughly. It varies by country and by
 * conversation category, and Meta revises it — so this is an estimate shown as
 * an estimate, and the customer pays Meta directly either way.
 */
const META_COST_USD: Record<RegionId, number> = {
  global: 0.04,
  mena: 0.035,
  south_asia: 0.004,
  africa_sea: 0.006,
};

/** Roughly how many messages make one 24-hour billable conversation. */
const MESSAGES_PER_CONVERSATION = 6;

export function calculateRoi(inputs: RoiInputs): RoiResult {
  const region = REGIONS.find((r) => r.id === inputs.region) ?? REGIONS[0];

  const messagesPerMonth = Math.max(0, inputs.messagesPerDay) * DAYS_PER_MONTH;
  const messagesAutomated = messagesPerMonth * AUTOMATION_RATE;

  const hoursSaved = (messagesAutomated * Math.max(0, inputs.minutesPerMessage)) / 60;
  const grossSaving = hoursSaved * Math.max(0, inputs.hourlyCost);

  const conversations = messagesPerMonth / MESSAGES_PER_CONVERSATION;
  const metaCost = conversations * META_COST_USD[region.id] * region.factor;

  const plan = planFor(conversations);
  const planCost = plan.usd * region.factor;

  const totalCost = planCost + metaCost;
  const netSaving = grossSaving - totalCost;

  return {
    currency: region.currency,
    automationRate: AUTOMATION_RATE,
    messagesAutomatedPerMonth: Math.round(messagesAutomated),
    hoursSavedPerMonth: Math.round(hoursSaved),
    grossSavingPerMonth: Math.round(grossSaving),
    planCostPerMonth: Math.round(planCost),
    planName: plan.name,
    metaCostPerMonth: Math.round(metaCost),
    netSavingPerMonth: Math.round(netSaving),
    roiMultiple: totalCost > 0 ? Number((netSaving / totalCost).toFixed(1)) : null,
    paybackDays:
      grossSaving > 0 ? Math.max(1, Math.round((totalCost / grossSaving) * DAYS_PER_MONTH)) : null,
  };
}

/** Cheapest plan whose monthly conversation allowance covers this volume. */
function planFor(conversationsPerMonth: number): { name: string; usd: number } {
  if (conversationsPerMonth <= 500) return { name: 'Starter', usd: 29 };
  if (conversationsPerMonth <= 3000) return { name: 'Growth', usd: 79 };
  return { name: 'Pro', usd: 199 };
}
