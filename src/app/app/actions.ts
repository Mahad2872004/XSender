'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { minorPerMajor } from '@/lib/money';
import { APP } from '@/lib/routes';
import { requireWorkspace } from '@/server/auth/session';
import {
  MAX_MINUTES_PER_MESSAGE,
  MIN_MINUTES_PER_MESSAGE,
  saveAssumptions,
} from '@/server/roi/summary';
import type { AssumptionState } from './form-state';

/**
 * Changing the ROI assumptions.
 *
 * Deliberately easy to reach and easy to change. An owner who suspects the
 * hours-saved figure is generous should be able to dial it down in two clicks
 * and watch the number move — that is what makes the remaining figure credible.
 */
const assumptionInput = z.object({
  minutesPerMessage: z
    .number()
    .min(MIN_MINUTES_PER_MESSAGE, `Use at least ${MIN_MINUTES_PER_MESSAGE} minutes.`)
    .max(MAX_MINUTES_PER_MESSAGE, `${MAX_MINUTES_PER_MESSAGE} minutes is the most this accepts.`),
  hourlyCostMajor: z.number().min(0, 'An hourly cost cannot be negative.').max(100_000),
});

export async function saveAssumptionsAction(
  _prev: AssumptionState,
  formData: FormData
): Promise<AssumptionState> {
  const parsed = assumptionInput.safeParse({
    minutesPerMessage: Number(formData.get('minutesPerMessage')),
    hourlyCostMajor: Number(formData.get('hourlyCostMajor')),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check those numbers.', saved: false };
  }

  const ctx = await requireWorkspace();

  try {
    await saveAssumptions(ctx, {
      minutesPerMessage: parsed.data.minutesPerMessage,
      hourlyCostMinor: Math.round(
        parsed.data.hourlyCostMajor * minorPerMajor(ctx.workspace.currency)
      ),
    });
  } catch (cause) {
    return {
      error: cause instanceof Error ? cause.message : 'Could not save that.',
      saved: false,
    };
  }

  revalidatePath(APP.dashboard);
  return { error: null, saved: true };
}
