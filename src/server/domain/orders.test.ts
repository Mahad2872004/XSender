import { describe, expect, it } from 'vitest';
import type { Order } from '@/lib/database.types';
import { cartSubtotalMinor, nextStatus, statusMessage, statusPipeline } from './orders';

function order(patch: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    workspace_id: 'w1',
    contact_id: 'c1',
    conversation_id: null,
    code: 'XS-1042',
    status: 'confirmed',
    fulfillment: 'delivery',
    address: null,
    latitude: null,
    longitude: null,
    scheduled_for: null,
    payment_method: 'cash',
    payment_status: 'unpaid',
    payment_reference: null,
    subtotal_minor: 75000,
    delivery_fee_minor: 0,
    total_minor: 75000,
    currency: 'PKR',
    notes: null,
    placed_by: 'flow',
    rating: null,
    rated_at: null,
    created_at: '2026-08-05T00:00:00.000Z',
    updated_at: '2026-08-05T00:00:00.000Z',
    completed_at: null,
    ...patch,
  };
}

describe('cartSubtotalMinor', () => {
  it('multiplies unit price by quantity', () => {
    expect(
      cartSubtotalMinor([
        { catalogItemId: null, name: 'Biryani', unitPriceMinor: 75000, quantity: 2 },
      ])
    ).toBe(150000);
  });

  it('adds option surcharges before multiplying', () => {
    expect(
      cartSubtotalMinor([
        {
          catalogItemId: null,
          name: 'Karahi',
          unitPriceMinor: 120000,
          quantity: 2,
          selectedOptions: [{ name: 'Size', choice: 'Large', priceDeltaMinor: 20000 }],
        },
      ])
    ).toBe(280000);
  });

  it('sums several lines', () => {
    expect(
      cartSubtotalMinor([
        { catalogItemId: null, name: 'A', unitPriceMinor: 30000, quantity: 1 },
        { catalogItemId: null, name: 'B', unitPriceMinor: 12000, quantity: 3 },
      ])
    ).toBe(66000);
  });

  it('is zero for an empty cart', () => {
    expect(cartSubtotalMinor([])).toBe(0);
  });
});

describe('statusPipeline', () => {
  it('routes delivery through out_for_delivery', () => {
    expect(statusPipeline('delivery')).toContain('out_for_delivery');
  });

  it('does not offer out_for_delivery on a pickup order', () => {
    // Telling a customer collecting their own food that it is "on its way"
    // is the kind of detail that makes automation look broken.
    expect(statusPipeline('pickup')).not.toContain('out_for_delivery');
    expect(statusPipeline('pickup')).toContain('ready');
  });
});

describe('nextStatus', () => {
  it('advances along the pipeline', () => {
    expect(nextStatus(order({ status: 'confirmed' }))).toBe('preparing');
    expect(nextStatus(order({ status: 'preparing' }))).toBe('out_for_delivery');
  });

  it('differs by fulfilment type', () => {
    expect(nextStatus(order({ status: 'preparing', fulfillment: 'pickup' }))).toBe('ready');
  });

  it('stops at the end of the pipeline', () => {
    expect(nextStatus(order({ status: 'completed' }))).toBeNull();
  });

  it('returns null for a status outside the pipeline', () => {
    expect(nextStatus(order({ status: 'cancelled' }))).toBeNull();
  });
});

describe('statusMessage', () => {
  it('includes the order code so the customer can match it up', () => {
    expect(statusMessage(order(), 'preparing')).toContain('XS-1042');
  });

  it('includes the total on confirmation', () => {
    expect(statusMessage(order(), 'confirmed')).toContain('Rs. 750');
  });

  it('words "ready" differently for pickup', () => {
    const pickup = statusMessage(order({ fulfillment: 'pickup' }), 'ready');
    expect(pickup).toContain('collection');
  });

  it('asks for a rating when the order completes', () => {
    expect(statusMessage(order(), 'completed')).toMatch(/1.?5/);
  });
});
