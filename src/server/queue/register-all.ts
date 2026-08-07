/**
 * Imports every module that registers a job handler.
 *
 * Registration happens as an import side effect, so the worker has to pull them
 * in explicitly — otherwise a job type exists in the enum, gets enqueued, and
 * then dead-letters with "no handler registered".
 *
 * Phases add to this list: message.send in Phase 4, the lifecycle automations
 * (booking.remind, cart.abandoned, contact.winback, campaign.dispatch) in
 * Phase 5.
 */
import '@/server/flow/resume-job';

export {};
