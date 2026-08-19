/**
 * Form state for the simulator's composer.
 *
 * Lives outside actions.ts because a 'use server' module may only export async
 * functions — a constant there becomes a runtime error when the module loads.
 */
export type SimulatorActionState = {
  error: string | null;
  notice: string | null;
  /**
   * The text that failed to send, so the composer can restore it. The field is
   * cleared optimistically the moment you hit send, so without this a rejected
   * message would simply vanish.
   */
  attempted?: string;
};

export const EMPTY_SIMULATOR_STATE: SimulatorActionState = { error: null, notice: null };
