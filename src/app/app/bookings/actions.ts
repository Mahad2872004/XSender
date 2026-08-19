'use server';

import { revalidatePath } from 'next/cache';
import type { BookingStatus } from '@/lib/database.types';
import { requireWorkspace } from '@/server/auth/session';
import { setBookingStatus } from '@/server/domain/bookings';

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<void> {
  const ctx = await requireWorkspace();
  await setBookingStatus(ctx, bookingId, status);
  revalidatePath('/app/bookings');
}
