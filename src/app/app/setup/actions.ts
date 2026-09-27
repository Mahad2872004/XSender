'use server';

import { revalidatePath } from 'next/cache';
import { APP } from '@/lib/routes';
import { requireWorkspace } from '@/server/auth/session';
import { setManualConfirmation, type ManualConfirmations } from '@/server/onboarding/checklist';

const ALLOWED: ReadonlyArray<keyof ManualConfirmations> = [
  'ownerWalkthroughAt',
  'feedbackCallAt',
];

/**
 * Tick or untick one of the two items nobody can observe from the data.
 *
 * The key is checked against a list rather than trusted, because it is written
 * straight into a jsonb column.
 */
export async function toggleConfirmation(key: string, done: boolean): Promise<void> {
  if (!ALLOWED.includes(key as keyof ManualConfirmations)) return;

  const ctx = await requireWorkspace();
  await setManualConfirmation(ctx, key as keyof ManualConfirmations, done);
  revalidatePath(APP.setup);
}
