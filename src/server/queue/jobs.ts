import { supabaseAdmin } from '@/server/db/admin';
import type { Job, Json } from '@/lib/database.types';

/**
 * Postgres-backed job queue.
 *
 * Vercel gives us no long-running execution, so anything delayed, scheduled,
 * retried or batched lands here and is drained by worker/index.ts. Claiming
 * uses FOR UPDATE SKIP LOCKED (see claim_jobs in 0005_jobs_events.sql) so
 * several workers can run without blocking each other.
 */

export type JobType =
  // Phase 1+ — advance a parked flow run when its delay elapses.
  | 'flow.resume'
  // Phase 4+ — deliver an outbound message through a channel adapter.
  | 'message.send'
  // Phase 5+ — lifecycle automations.
  | 'booking.remind'
  | 'cart.abandoned'
  | 'contact.winback'
  | 'campaign.dispatch'
  // Housekeeping for the public demo's throwaway conversations.
  | 'demo.reap';

export interface EnqueueOptions {
  type: JobType;
  workspaceId?: string;
  payload?: Record<string, unknown>;
  /** When to run. Defaults to now. */
  runAt?: Date;
  maxAttempts?: number;
  /**
   * Makes enqueueing idempotent — a second call with the same key while the
   * first is still pending or running is a no-op. Use it for anything that
   * could be scheduled twice, e.g. `booking-reminder:<booking_id>`.
   */
  dedupeKey?: string;
}

export async function enqueue(options: EnqueueOptions): Promise<Job | null> {
  const { data, error } = await supabaseAdmin()
    .from('jobs')
    .insert({
      type: options.type,
      workspace_id: options.workspaceId ?? null,
      payload: (options.payload ?? {}) as Json,
      run_at: (options.runAt ?? new Date()).toISOString(),
      max_attempts: options.maxAttempts ?? 5,
      dedupe_key: options.dedupeKey ?? null,
      status: 'pending',
    })
    .select()
    .maybeSingle();

  if (error) {
    // 23505 is unique_violation — the dedupe key already has a live job, which
    // is the intended outcome rather than a failure.
    if (error.code === '23505' && options.dedupeKey) return null;
    throw new Error(`Could not enqueue ${options.type}: ${error.message}`);
  }

  return data;
}

/** Claim a batch of due jobs and mark them running. */
export async function claimJobs(workerId: string, batchSize = 10): Promise<Job[]> {
  const { data, error } = await supabaseAdmin().rpc('claim_jobs', {
    worker_id: workerId,
    batch_size: batchSize,
  });

  if (error) throw new Error(`Could not claim jobs: ${error.message}`);
  return data ?? [];
}

export async function completeJob(jobId: number): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq('id', jobId);

  if (error) throw new Error(`Could not complete job ${jobId}: ${error.message}`);
}

/**
 * Record a failure. Retries with exponential backoff until max_attempts, then
 * the job goes to 'dead' where the dead-letter view can surface it.
 */
export async function failJob(job: Job, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message : String(cause);
  const exhausted = job.attempts >= job.max_attempts;

  // 30s, 1m, 2m, 4m, … capped at 30 minutes.
  const backoffMs = Math.min(30_000 * 2 ** (job.attempts - 1), 30 * 60_000);

  const { error } = await supabaseAdmin()
    .from('jobs')
    .update({
      status: exhausted ? 'dead' : 'pending',
      run_at: new Date(Date.now() + backoffMs).toISOString(),
      last_error: message.slice(0, 2000),
      locked_at: null,
      locked_by: null,
    })
    .eq('id', job.id);

  if (error) throw new Error(`Could not record failure for job ${job.id}: ${error.message}`);
}

/** Return jobs abandoned by a crashed worker to the queue. */
export async function reapStalledJobs(): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc('reap_stalled_jobs', {
    stall_after: '5 minutes',
  });

  if (error) throw new Error(`Could not reap stalled jobs: ${error.message}`);
  return data ?? 0;
}
