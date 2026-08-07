/**
 * xSender background worker.
 *
 * Drains the Postgres job queue: delayed flow steps, outbound sends, booking
 * reminders, abandoned-cart nudges, campaign batches. Runs as its own process
 * because Vercel's serverless functions cannot hold work open.
 *
 *   npm run worker         # local, watches for changes
 *   npm run worker:start   # production
 *
 * Handlers are registered by feature modules via registerHandler(); this file
 * only owns the loop, the backoff, and shutdown.
 */

import { randomUUID } from 'node:crypto';
// Side-effect import: registers every job handler before the loop starts.
import '@/server/queue/register-all';
import { claimJobs, completeJob, failJob, reapStalledJobs } from '@/server/queue/jobs';
import { registeredJobTypes, resolveHandler } from '@/server/queue/handlers';

const WORKER_ID = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE ?? 10);
const IDLE_DELAY_MS = Number(process.env.WORKER_IDLE_DELAY_MS ?? 1000);
const REAP_INTERVAL_MS = 60_000;

let running = true;
let lastReapAt = 0;

function log(level: 'info' | 'warn' | 'error', message: string, extra?: unknown) {
  const line = { ts: new Date().toISOString(), level, worker: WORKER_ID, message, ...(extra ? { extra } : {}) };
  console[level === 'info' ? 'log' : level](JSON.stringify(line));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOnce(): Promise<number> {
  // Periodically return jobs held by workers that died mid-flight.
  if (Date.now() - lastReapAt > REAP_INTERVAL_MS) {
    lastReapAt = Date.now();
    const reaped = await reapStalledJobs();
    if (reaped > 0) log('warn', `Reclaimed ${reaped} stalled job(s)`);
  }

  const jobs = await claimJobs(WORKER_ID, BATCH_SIZE);

  for (const job of jobs) {
    const startedAt = Date.now();
    try {
      await resolveHandler(job.type)(job);
      await completeJob(job.id);
      log('info', `Completed ${job.type}`, { jobId: job.id, ms: Date.now() - startedAt });
    } catch (cause) {
      // failJob decides between retry-with-backoff and dead-letter.
      await failJob(job, cause);
      log('error', `Failed ${job.type}`, {
        jobId: job.id,
        attempt: job.attempts,
        maxAttempts: job.max_attempts,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  return jobs.length;
}

async function main() {
  log('info', 'Worker started', { handlers: registeredJobTypes(), batchSize: BATCH_SIZE });

  while (running) {
    try {
      const processed = await runOnce();
      // Only pause when the queue came back empty, so a backlog drains at speed.
      if (processed === 0) await sleep(IDLE_DELAY_MS);
    } catch (cause) {
      // Claiming itself failed — most likely the database is briefly
      // unreachable. Back off rather than spinning on the error.
      log('error', 'Worker loop error', {
        error: cause instanceof Error ? cause.message : String(cause),
      });
      await sleep(5000);
    }
  }

  log('info', 'Worker stopped');
}

function shutdown(signal: string) {
  if (!running) return;
  running = false;
  log('info', `Received ${signal}, finishing current batch…`);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((cause) => {
  log('error', 'Worker crashed', {
    error: cause instanceof Error ? cause.stack ?? cause.message : String(cause),
  });
  process.exit(1);
});
