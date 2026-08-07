import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { queueEnv } from '@/lib/env';
import { drainBatch, newWorkerId } from '@/server/queue/drain';
import { reapStalledJobs } from '@/server/queue/jobs';

/**
 * Cron-triggered queue drain, for deployments with no worker process.
 *
 * worker/index.ts is still the reference drainer and the better one — it polls
 * every second and drains a backlog at full speed. This route exists because a
 * serverless host has nowhere to run that loop, so pg_cron pokes this endpoint
 * instead (see supabase/migrations/0010_queue_cron.sql) and each call drains
 * what it can inside one invocation.
 *
 * Running both at once is safe: claim_jobs takes rows FOR UPDATE SKIP LOCKED,
 * so two drainers never get the same job.
 *
 * Authenticated by a shared secret rather than a session — the caller is
 * Postgres, not a signed-in user. This path is exempt from the auth gate in
 * src/proxy.ts, so the check below is the only thing guarding it.
 */

// Vercel reads this from the build output to size the function's limit; the
// Hobby ceiling is 60s, and TIME_BUDGET_MS stops the loop before it.
export const maxDuration = 60;

/** Leaves headroom for the final job to finish and the response to flush. */
const TIME_BUDGET_MS = 50_000;
const BATCH_SIZE = 10;

function authorized(request: NextRequest, secret: string): boolean {
  const presented = request.headers.get('x-queue-secret') ?? '';
  // Hashing first gives both sides the fixed, equal length timingSafeEqual
  // requires, and keeps the comparison from leaking the secret's length.
  return timingSafeEqual(
    createHash('sha256').update(presented).digest(),
    createHash('sha256').update(secret).digest()
  );
}

export async function POST(request: NextRequest) {
  let secret: string;
  try {
    secret = queueEnv().QUEUE_DRAIN_SECRET;
  } catch {
    // Fail closed. An unset secret would otherwise leave the queue drainable
    // by anyone who guessed the path.
    return NextResponse.json({ error: 'Queue drain is not configured.' }, { status: 503 });
  }

  if (!authorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const workerId = newWorkerId('drain');
  const startedAt = Date.now();
  const totals = { batches: 0, claimed: 0, completed: 0, failed: 0 };

  try {
    // Nothing else reclaims jobs abandoned by an invocation that timed out
    // mid-job, so this takes the place of the worker's periodic reap.
    const reaped = await reapStalledJobs();

    // Keep going while work remains and time is left, so a backlog clears in
    // one call instead of one batch per cron tick.
    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      const batch = await drainBatch({ workerId, batchSize: BATCH_SIZE });
      totals.batches += 1;
      totals.claimed += batch.claimed;
      totals.completed += batch.completed;
      totals.failed += batch.failed;

      if (batch.claimed === 0) break;
    }

    const ms = Date.now() - startedAt;
    return NextResponse.json({
      workerId,
      reaped,
      ...totals,
      ms,
      // Budget ran out with work still queued — the next tick picks up the rest.
      truncated: ms >= TIME_BUDGET_MS,
    });
  } catch (cause) {
    // Report the partial result rather than a bare 500, so a failing drain is
    // legible in the cron log instead of just "error".
    return NextResponse.json(
      {
        error: cause instanceof Error ? cause.message : String(cause),
        workerId,
        ...totals,
        ms: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}
