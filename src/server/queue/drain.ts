import { randomUUID } from 'node:crypto';
// Side-effect import: registers every job handler. It lives here rather than in
// each caller so a new entrypoint cannot forget it and dead-letter every job
// with "no handler registered".
import '@/server/queue/register-all';
import type { Job } from '@/lib/database.types';
import { resolveHandler } from './handlers';
import { claimJobs, completeJob, failJob } from './jobs';

/**
 * One pass over the queue: claim a batch, run each job, record the outcome.
 *
 * Shared by the long-running worker (worker/index.ts) and the cron-triggered
 * drain route, so both execute jobs through exactly the same path. Reaping and
 * pacing deliberately stay with the caller — a forever-loop and a serverless
 * invocation want different cadences for both.
 */

export interface JobOutcome {
  job: Job;
  status: 'completed' | 'failed';
  ms: number;
  /** Set only when status is 'failed'. */
  error?: string;
}

export interface DrainOptions {
  workerId: string;
  batchSize?: number;
  /** Called once per job so each caller can log in its own format. */
  onJob?: (outcome: JobOutcome) => void;
}

export interface DrainResult {
  claimed: number;
  completed: number;
  failed: number;
}

/** Identifies which process holds a job, for reap_stalled_jobs and debugging. */
export function newWorkerId(prefix: string): string {
  return `${prefix}-${process.pid}-${randomUUID().slice(0, 8)}`;
}

export async function drainBatch(options: DrainOptions): Promise<DrainResult> {
  const jobs = await claimJobs(options.workerId, options.batchSize ?? 10);
  const result: DrainResult = { claimed: jobs.length, completed: 0, failed: 0 };

  for (const job of jobs) {
    const startedAt = Date.now();

    try {
      await resolveHandler(job.type)(job);
      await completeJob(job.id);
      result.completed += 1;
      options.onJob?.({ job, status: 'completed', ms: Date.now() - startedAt });
    } catch (cause) {
      // failJob decides between retry-with-backoff and dead-letter. If it
      // throws in turn the database is unreachable, so the error propagates and
      // the rest of the batch is left for reap_stalled_jobs to reclaim.
      await failJob(job, cause);
      result.failed += 1;
      options.onJob?.({
        job,
        status: 'failed',
        ms: Date.now() - startedAt,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return result;
}
