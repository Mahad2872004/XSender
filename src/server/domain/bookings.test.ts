import { describe, expect, it } from 'vitest';
import { summariseSlots, type Slot } from './bookings';

function slot(hour: number, resourceId = 'r1'): Slot {
  const startsAt = new Date('2026-08-06T00:00:00.000Z');
  startsAt.setUTCHours(hour);
  const endsAt = new Date(startsAt);
  endsAt.setUTCHours(hour + 1);

  return { startsAt, endsAt, resourceId, resourceName: 'Table 1', capacity: 4 };
}

describe('summariseSlots', () => {
  it('returns everything when it already fits', () => {
    const slots = [slot(12), slot(13), slot(14)];
    expect(summariseSlots(slots)).toHaveLength(3);
  });

  it('caps the list so it fits a WhatsApp list', () => {
    // WhatsApp allows 10 rows; offering more silently truncates on the device.
    const slots = Array.from({ length: 24 }, (_, i) => slot(i));
    expect(summariseSlots(slots).length).toBeLessThanOrEqual(9);
  });

  it('spreads the offer across the day rather than taking the first nine', () => {
    const slots = Array.from({ length: 24 }, (_, i) => slot(i));
    const summarised = summariseSlots(slots);

    const first = summarised[0].startsAt.getUTCHours();
    const last = summarised[summarised.length - 1].startsAt.getUTCHours();

    // Nine consecutive slots from opening time would span 8 hours; a spread
    // sample covers far more of the day.
    expect(last - first).toBeGreaterThan(8);
  });

  it('keeps chronological order', () => {
    const slots = Array.from({ length: 20 }, (_, i) => slot(i));
    const summarised = summariseSlots(slots);

    for (let i = 1; i < summarised.length; i++) {
      expect(summarised[i].startsAt.getTime()).toBeGreaterThan(
        summarised[i - 1].startsAt.getTime()
      );
    }
  });

  it('handles an empty list', () => {
    expect(summariseSlots([])).toEqual([]);
  });
});
