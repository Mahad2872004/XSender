/**
 * Form state for the channel connect form.
 *
 * Separate from actions.ts because a 'use server' module may only export async
 * functions.
 */
export type ConnectState = {
  error: string | null;
  /** Set on success so the form can confirm exactly which number was attached. */
  connected: { displayPhoneNumber: string | null; verifiedName: string | null } | null;
  /** Echoed back so a rejected attempt does not lose what was typed. */
  values?: { displayName: string; phoneNumberId: string; wabaId: string };
};

export const EMPTY_CONNECT_STATE: ConnectState = { error: null, connected: null };
