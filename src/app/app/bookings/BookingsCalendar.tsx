'use client';

import { useTransition } from 'react';
import { Bot, CalendarClock, Check, X } from 'lucide-react';
import type { BookingStatus, ResourceType } from '@/lib/database.types';
import LocalTime from '@/components/LocalTime/LocalTime';
import { updateBookingStatus } from './actions';
import styles from './bookings.module.css';

export type BookingRow = {
  id: string;
  code: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  partySize: number | null;
  notes: string | null;
  placedBy: string;
  resourceName: string | null;
  customerName: string | null;
  customerPhone: string | null;
};

export type ResourceRow = {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
};

/**
 * Bookings grouped by day.
 *
 * A day list rather than a grid: the question staff actually ask is "what have
 * we got today", and a week grid answers that worse on a phone behind a
 * counter.
 */
export default function BookingsCalendar({
  bookings,
  resources,
}: {
  bookings: BookingRow[];
  resources: ResourceRow[];
}) {
  const [pending, startTransition] = useTransition();

  const days = groupByDay(bookings);
  const automated = bookings.filter((b) => b.placedBy === 'flow').length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Bookings</h2>
          <p className={styles.subtitle}>
            {bookings.length === 0
              ? 'Reservations taken in chat appear here.'
              : `${bookings.length} upcoming` +
                (automated > 0 ? ` · ${automated} booked without staff involvement` : '')}
          </p>
        </div>
      </header>

      {resources.length === 0 && (
        <div className={styles.warning}>
          <strong>No bookable resources yet.</strong> Booking flows need something to
          book — a table, a room, or a member of staff — with opening hours attached.
          These are created for you during setup; if you skipped that, no times can be
          offered.
        </div>
      )}

      {resources.length > 0 && (
        <div className={styles.resources}>
          <span className={styles.resourcesLabel}>Bookable</span>
          {resources.map((resource) => (
            <span key={resource.id} className={styles.resourceChip}>
              {resource.name}
              {resource.capacity > 1 && (
                <span className={styles.capacity}>×{resource.capacity}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {bookings.length === 0 && resources.length > 0 && (
        <div className={styles.empty}>
          <CalendarClock size={22} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nothing booked yet</p>
          <p className={styles.emptyBody}>
            Try the booking flow in the Simulator — reservations made there are real and
            show up here.
          </p>
        </div>
      )}

      {days.map(([dayKey, dayBookings]) => (
        <section key={dayKey} className={styles.day}>
          <div className={styles.dayHead}>
            <h3 className={styles.dayTitle}>{formatDayHeading(dayKey)}</h3>
            <span className={styles.dayCount}>
              {dayBookings.length} {dayBookings.length === 1 ? 'booking' : 'bookings'}
            </span>
          </div>

          <ul className={styles.list}>
            {dayBookings.map((booking) => (
              <li
                key={booking.id}
                className={`${styles.booking} ${
                  booking.status === 'cancelled' || booking.status === 'no_show'
                    ? styles.bookingOff
                    : ''
                }`}
              >
                <div className={styles.time}>
                  <LocalTime value={booking.startsAt} />
                </div>

                <div className={styles.details}>
                  <div className={styles.detailsTop}>
                    <span className={styles.customerName}>
                      {booking.customerName ?? booking.customerPhone ?? 'Customer'}
                    </span>
                    {booking.partySize && (
                      <span className={styles.party}>
                        {booking.partySize} {booking.partySize === 1 ? 'person' : 'people'}
                      </span>
                    )}
                    {booking.placedBy === 'flow' && (
                      <span className={styles.botTag} title="Booked by automation">
                        <Bot size={11} />
                        Automated
                      </span>
                    )}
                  </div>
                  <span className={styles.detailsSub}>
                    {booking.code}
                    {booking.resourceName && ` · ${booking.resourceName}`}
                  </span>
                  {booking.notes && <span className={styles.notes}>{booking.notes}</span>}
                </div>

                <span className={styles[`status_${booking.status}`] ?? styles.status_pending}>
                  {STATUS_LABEL[booking.status]}
                </span>

                {booking.status === 'confirmed' && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.doneBtn}
                      disabled={pending}
                      title="Mark as completed"
                      onClick={() =>
                        startTransition(() => void updateBookingStatus(booking.id, 'completed'))
                      }
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      disabled={pending}
                      title="Cancel this booking"
                      onClick={() =>
                        startTransition(() => void updateBookingStatus(booking.id, 'cancelled'))
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Bucket by calendar day, preserving chronological order. */
function groupByDay(bookings: BookingRow[]): Array<[string, BookingRow[]]> {
  const buckets = new Map<string, BookingRow[]>();

  for (const booking of bookings) {
    const key = booking.startsAt.slice(0, 10);
    const existing = buckets.get(key);
    if (existing) existing.push(booking);
    else buckets.set(key, [booking]);
  }

  return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatDayHeading(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  return day.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
