import { requireOnboarded } from '@/server/auth/session';
import { listBookings, listResources } from '@/server/domain/bookings';
import BookingsCalendar, { type BookingRow } from './BookingsCalendar';

export const metadata = { title: 'Bookings · xSender' };

export default async function BookingsPage() {
  const ctx = await requireOnboarded();

  // Yesterday onward, so this morning's bookings do not disappear at midday.
  const from = new Date();
  from.setDate(from.getDate() - 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(from);
  to.setDate(to.getDate() + 15);

  const [bookings, resources] = await Promise.all([
    listBookings(ctx, { from, to }),
    listResources(ctx),
  ]);

  const rows: BookingRow[] = bookings.map((booking) => ({
    id: booking.id,
    code: booking.code,
    status: booking.status,
    startsAt: booking.starts_at,
    endsAt: booking.ends_at,
    partySize: booking.party_size,
    notes: booking.notes,
    placedBy: booking.placed_by,
    resourceName: booking.resource?.name ?? null,
    customerName: booking.contact?.full_name ?? null,
    customerPhone: booking.contact?.phone ?? null,
  }));

  return (
    <BookingsCalendar
      bookings={rows}
      resources={resources.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
      }))}
    />
  );
}
