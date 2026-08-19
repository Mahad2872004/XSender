/**
 * Form state for the setup wizard.
 *
 * Lives outside actions.ts because a 'use server' module may only export async
 * functions — a constant there becomes a runtime error when the module loads.
 */
export type WelcomeState = { error: string | null };

export const EMPTY_WELCOME_STATE: WelcomeState = { error: null };
