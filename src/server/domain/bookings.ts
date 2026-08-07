import type {
  AvailabilityException,
  AvailabilityRule,
  Booking,
  BookingStatus,
  Json,
  Resource,
} from '@/lib/database.types';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Bookings and availability.
 *
 * A slot is offerable when three things hold: an availability rule covers it,
 * no exception closes that day, and nothing else already occupies the resource
 * at that time.
 *
 * `capacity` means **how many people the resource holds** — seats at a table,
 * not simultaneous bookings. A resource takes one booking at a time, which is
 * what the bookings_no_overlap exclusion constraint enforces. Treating capacity
 * as concurrency would offer four parties the same four-seat table and then
 * have the database reject three of them at the moment of confirmation.
 */

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  resourceId: string;
  resourceName: string;
  /** How many people this resource seats — not how many bookings it can take. */
  capacity: number;
}

export class SlotUnavailableError extends Error {
  constructor(message = 'That time has just been taken. Please choose another.') {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

/** Parse '09:30:00' into minutes past midnight. */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function atMinutes(day: Date, minutes: number): Date {
  const result = new Date(day);
  result.setHours(0, 0, 0, 0);
  result.setMinutes(minutes);
  return result;
}

/**
 * Offerable slots for a day.
 *
 * `now` is injectable so the caller can test the "don't offer times in the
 * past" rule without waiting for the clock.
 */
export async function availableSlots(
  ctx: WorkspaceContext,
  options: {
    date: Date;
    durationMinutes?: number;
    resourceId?: string;
    partySize?: number;
    now?: Date;
  }
): Promise<Slot[]> {
  const { date, partySize = 1 } = options;
  const now = options.now ?? new Date();

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const weekday = dayStart.getDay();
  const isoDate = dayStart.toISOString().slice(0, 10);

  const [resourcesResult, rulesResult, exceptionsResult, bookingsResult] = await Promise.all([
    ctx.table('resources').select().eq('active', true).limit(200),
    ctx.table('availability_rules').select().eq('weekday', weekday).limit(500),
    ctx.table('availability_exceptions').select().eq('on_date', isoDate).limit(200),
    ctx
      .table('bookings')
      .select()
      .gte('starts_at', dayStart.toISOString())
      .lt('starts_at', dayEnd.toISOString())
      .in('status', ['pending', 'confirmed'])
      .limit(500),
  ]);

  const resources = (resourcesResult.data ?? []).filter(
    (r) => !options.resourceId || r.id === options.resourceId
  );
  const rules = rulesResult.data ?? [];
  const exceptions = exceptionsResult.data ?? [];
  const booked = bookingsResult.data ?? [];

  const slots: Slot[] = [];

  for (const resource of resources) {
    // A table for two cannot seat six.
    if (partySize > resource.capacity) continue;

    const exception = exceptions.find((e) => e.resource_id === resource.id);
    if (exception?.closed) continue;

    for (const rule of rules.filter((r) => r.resource_id === resource.id)) {
      const { open, close } = applyException(rule, exception);
      const duration = options.durationMinutes ?? rule.slot_minutes;

      for (let start = open; start + duration <= close; start += rule.slot_minutes) {
        const startsAt = atMinutes(dayStart, start);
        const endsAt = atMinutes(dayStart, start + duration);

        // Never offer a time that has already passed.
        if (startsAt <= now) continue;

        // One booking per resource at a time, matching the database's
        // exclusion constraint. Offering anything else guarantees a rejection
        // at confirmation time.
        const taken = booked.some(
          (b) =>
            b.resource_id === resource.id &&
            new Date(b.starts_at) < endsAt &&
            new Date(b.ends_at) > startsAt
        );
        if (taken) continue;

        slots.push({
          startsAt,
          endsAt,
          resourceId: resource.id,
          resourceName: resource.name,
          capacity: resource.capacity,
        });
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** An exception may close the day outright, or just shift the hours. */
function applyException(
  rule: AvailabilityRule,
  exception: AvailabilityException | undefined
): { open: number; close: number } {
  const open = exception?.start_time
    ? timeToMinutes(exception.start_time)
    : timeToMinutes(rule.start_time);
  const close = exception?.end_time
    ? timeToMinutes(exception.end_time)
    : timeToMinutes(rule.end_time);
  return { open, close };
}

export async function createBooking(
  ctx: WorkspaceContext,
  input: {
    contactId: string;
    conversationId?: string | null;
    resourceId?: string | null;
    catalogItemId?: string | null;
    startsAt: Date;
    endsAt: Date;
    partySize?: number | null;
    notes?: string | null;
    placedBy?: 'flow' | 'agent';
  }
): Promise<Booking> {
  const { data: code, error: codeError } = await ctx.db.rpc('next_booking_code', {
    ws: ctx.workspaceId,
  });
  if (codeError || !code) {
    throw new Error(`Could not allocate a booking code: ${codeError?.message}`);
  }

  const { data, error } = await ctx
    .table('bookings')
    .insert({
      contact_id: input.contactId,
      conversation_id: input.conversationId ?? null,
      resource_id: input.resourceId ?? null,
      catalog_item_id: input.catalogItemId ?? null,
      code,
      status: 'confirmed',
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      party_size: input.partySize ?? null,
      notes: input.notes ?? null,
      placed_by: input.placedBy ?? 'flow',
    })
    .select()
    .single();

  if (error || !data) {
    // 23P01 is exclusion_violation — the slot was taken between offering it and
    // confirming it. That is a race we expect, not a bug, so it gets a message
    // the customer can act on.
    if (error?.code === '23P01') throw new SlotUnavailableError();
    throw new Error(`Could not create the booking: ${error?.message}`);
  }

  await ctx.table('events').insert({
    type: 'booking.created',
    entity_type: 'booking',
    entity_id: data.id,
    payload: { code: data.code, startsAt: data.starts_at, placedBy: data.placed_by } as Json,
  });

  return data;
}

export async function setBookingStatus(
  ctx: WorkspaceContext,
  bookingId: string,
  status: BookingStatus
): Promise<Booking> {
  const { data, error } = await ctx
    .table('bookings')
    .update({ status })
    .eq('id', bookingId)
    .select()
    .single();

  if (error || !data) throw new Error(`Could not update the booking: ${error?.message}`);
  return data;
}

export interface BookingListRow extends Booking {
  contact: { id: string; full_name: string | null; phone: string | null } | null;
  resource: { id: string; name: string } | null;
}

export async function listBookings(
  ctx: WorkspaceContext,
  options: { from?: Date; to?: Date; limit?: number } = {}
): Promise<BookingListRow[]> {
  const from = options.from ?? new Date();
  const to = options.to ?? new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

  const { data } = await ctx.db
    .from('bookings')
    .select('*, contact:contacts(id, full_name, phone), resource:resources(id, name)')
    .eq('workspace_id', ctx.workspaceId)
    .gte('starts_at', from.toISOString())
    .lte('starts_at', to.toISOString())
    .order('starts_at', { ascending: true })
    .limit(options.limit ?? 200);

  return (data ?? []) as unknown as BookingListRow[];
}

export async function listResources(ctx: WorkspaceContext): Promise<Resource[]> {
  const { data } = await ctx.table('resources').select().order('name').limit(200);
  return data ?? [];
}

/** Group slots by day-part so a chat list stays under WhatsApp's 10-row cap. */
export function summariseSlots(slots: Slot[], max = 9): Slot[] {
  if (slots.length <= max) return slots;

  // Spread the offer across the day rather than showing nine consecutive
  // half-hours from opening time.
  const step = Math.ceil(slots.length / max);
  return slots.filter((_, index) => index % step === 0).slice(0, max);
}
