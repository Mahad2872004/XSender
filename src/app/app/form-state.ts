/**
 * Form state for the ROI assumption editor.
 *
 * Outside actions.ts because a 'use server' module may only export async
 * functions.
 */
export type AssumptionState = {
  error: string | null;
  saved: boolean;
};

export const EMPTY_ASSUMPTION_STATE: AssumptionState = { error: null, saved: false };
