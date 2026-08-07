import type { BusinessVertical } from '@/lib/database.types';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Starter catalog and resources per vertical.
 *
 * A flow that reads an empty menu is a flow that cannot be demoed, so first-run
 * setup seeds something real to edit rather than an empty screen and a blank
 * form. Prices are in minor units.
 */

interface SeedCategory {
  name: string;
  items: Array<{ name: string; priceMajor: number; description?: string; durationMinutes?: number }>;
}

interface SeedResource {
  name: string;
  type: 'table' | 'staff' | 'room' | 'property' | 'other';
  capacity: number;
  /** Local opening hours applied to every day it is open. */
  open: string;
  close: string;
  slotMinutes: number;
  /** 0 = Sunday. */
  weekdays: number[];
}

interface VerticalSeed {
  itemType: 'menu_item' | 'product' | 'service';
  categories: SeedCategory[];
  resources: SeedResource[];
}

const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];
const MON_TO_SAT = [1, 2, 3, 4, 5, 6];

const SEEDS: Record<BusinessVertical, VerticalSeed> = {
  restaurant: {
    itemType: 'menu_item',
    categories: [
      {
        name: 'Mains',
        items: [
          { name: 'Beef Biryani', priceMajor: 750, description: 'Slow-cooked, served with raita' },
          { name: 'Chicken Karahi', priceMajor: 1200, description: 'Serves two' },
          { name: 'Seekh Kebab', priceMajor: 600, description: 'Four skewers' },
        ],
      },
      {
        name: 'Starters',
        items: [
          { name: 'Chicken Corn Soup', priceMajor: 300 },
          { name: 'Spring Rolls', priceMajor: 350, description: 'Six pieces' },
        ],
      },
      {
        name: 'Drinks',
        items: [
          { name: 'Fresh Lime', priceMajor: 180 },
          { name: 'Soft Drink', priceMajor: 120 },
        ],
      },
    ],
    resources: [
      { name: 'Table 1', type: 'table', capacity: 4, open: '12:00', close: '23:00', slotMinutes: 90, weekdays: ALL_WEEK },
      { name: 'Table 2', type: 'table', capacity: 4, open: '12:00', close: '23:00', slotMinutes: 90, weekdays: ALL_WEEK },
      { name: 'Table 3', type: 'table', capacity: 8, open: '12:00', close: '23:00', slotMinutes: 90, weekdays: ALL_WEEK },
    ],
  },

  clinic: {
    itemType: 'service',
    categories: [
      {
        name: 'Appointments',
        items: [
          { name: 'Consultation', priceMajor: 2500, durationMinutes: 30 },
          { name: 'Follow-up visit', priceMajor: 1500, durationMinutes: 15 },
          { name: 'Full check-up', priceMajor: 5000, durationMinutes: 45 },
        ],
      },
    ],
    resources: [
      { name: 'Dr. Ahmed', type: 'staff', capacity: 1, open: '09:00', close: '17:00', slotMinutes: 30, weekdays: MON_TO_SAT },
      { name: 'Dr. Fatima', type: 'staff', capacity: 1, open: '14:00', close: '20:00', slotMinutes: 30, weekdays: MON_TO_SAT },
    ],
  },

  real_estate: {
    itemType: 'product',
    categories: [
      {
        name: 'Listings',
        items: [
          { name: '2-bed apartment, DHA Phase 5', priceMajor: 25_000_000 },
          { name: '1 kanal house, Bahria Town', priceMajor: 55_000_000 },
        ],
      },
    ],
    resources: [
      { name: 'Viewing agent', type: 'staff', capacity: 1, open: '10:00', close: '18:00', slotMinutes: 60, weekdays: ALL_WEEK },
    ],
  },

  ecommerce: {
    itemType: 'product',
    categories: [
      {
        name: 'Bestsellers',
        items: [
          { name: 'Cotton Kurta', priceMajor: 2200 },
          { name: 'Leather Wallet', priceMajor: 3500 },
          { name: 'Canvas Tote', priceMajor: 1400 },
        ],
      },
    ],
    resources: [],
  },

  other: {
    itemType: 'service',
    categories: [
      {
        name: 'Services',
        items: [{ name: 'Standard service', priceMajor: 1000, durationMinutes: 30 }],
      },
    ],
    resources: [
      { name: 'Main resource', type: 'other', capacity: 1, open: '09:00', close: '18:00', slotMinutes: 30, weekdays: MON_TO_SAT },
    ],
  },
};

/**
 * Seed the catalog and bookable resources for a vertical.
 *
 * Does nothing if the workspace already has items — re-running setup must not
 * duplicate a menu the client has since edited.
 */
export async function seedVerticalData(
  ctx: WorkspaceContext,
  vertical: BusinessVertical
): Promise<{ items: number; resources: number }> {
  const { data: existing } = await ctx.table('catalog_items').select().limit(1);
  if ((existing ?? []).length > 0) return { items: 0, resources: 0 };

  const seed = SEEDS[vertical];
  const multiplier = 100; // PKR and most currencies use 2 decimal places

  // Categories first — items reference them.
  const { data: categories, error: categoryError } = await ctx
    .table('catalog_categories')
    .insert(
      seed.categories.map((category, index) => ({
        name: category.name,
        sort_order: index,
      }))
    )
    .select();

  if (categoryError) throw new Error(`Could not seed categories: ${categoryError.message}`);

  const byName = new Map((categories ?? []).map((c) => [c.name, c.id]));

  const itemRows = seed.categories.flatMap((category, categoryIndex) =>
    category.items.map((item, itemIndex) => ({
      category_id: byName.get(category.name) ?? null,
      type: seed.itemType,
      name: item.name,
      description: item.description ?? null,
      price_minor: item.priceMajor * multiplier,
      currency: ctx.workspace.currency,
      duration_minutes: item.durationMinutes ?? null,
      sort_order: categoryIndex * 100 + itemIndex,
    }))
  );

  const { data: items, error: itemError } = await ctx
    .table('catalog_items')
    .insert(itemRows)
    .select();

  if (itemError) throw new Error(`Could not seed items: ${itemError.message}`);

  if (seed.resources.length === 0) {
    return { items: (items ?? []).length, resources: 0 };
  }

  const { data: resources, error: resourceError } = await ctx
    .table('resources')
    .insert(
      seed.resources.map((resource) => ({
        name: resource.name,
        type: resource.type,
        capacity: resource.capacity,
      }))
    )
    .select();

  if (resourceError) throw new Error(`Could not seed resources: ${resourceError.message}`);

  const ruleRows = (resources ?? []).flatMap((resource) => {
    const spec = seed.resources.find((r) => r.name === resource.name);
    if (!spec) return [];
    return spec.weekdays.map((weekday) => ({
      resource_id: resource.id,
      weekday,
      start_time: spec.open,
      end_time: spec.close,
      slot_minutes: spec.slotMinutes,
    }));
  });

  if (ruleRows.length > 0) {
    const { error: ruleError } = await ctx.table('availability_rules').insert(ruleRows);
    if (ruleError) throw new Error(`Could not seed opening hours: ${ruleError.message}`);
  }

  return { items: (items ?? []).length, resources: (resources ?? []).length };
}
