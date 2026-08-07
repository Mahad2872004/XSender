import type { Job } from '@/lib/database.types';
import type { JobType } from './jobs';

/**
 * Job type → handler. Phases register their handlers here as they land:
 * flow.resume in Phase 1, message.send in Phase 4, the lifecycle automations
 * in Phase 5.
 *
 * A job whose type has no handler is treated as a failure rather than silently
 * completed, so a typo in an enqueue call surfaces in the dead-letter list
 * instead of vanishing.
 */
export type JobHandler = (job: Job) => Promise<void>;

const handlers = new Map<string, JobHandler>();

export function registerHandler(type: JobType, handler: JobHandler): void {
  if (handlers.has(type)) {
    throw new Error(`A handler is already registered for job type "${type}".`);
  }
  handlers.set(type, handler);
}

export function resolveHandler(type: string): JobHandler {
  const handler = handlers.get(type);
  if (!handler) {
    throw new Error(`No handler registered for job type "${type}".`);
  }
  return handler;
}

export function registeredJobTypes(): string[] {
  return [...handlers.keys()].sort();
}
