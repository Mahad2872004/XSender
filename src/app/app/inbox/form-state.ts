/**
 * Form state for the inbox composer.
 *
 * Outside actions.ts because a 'use server' module may only export async
 * functions — a constant there is a runtime error when the module loads.
 */
export type InboxActionState = {
  error: string | null;
  /** Restored into the composer when a send is rejected, so it is not lost. */
  attempted?: string;
};

export const EMPTY_INBOX_STATE: InboxActionState = { error: null };
