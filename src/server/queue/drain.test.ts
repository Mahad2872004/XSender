import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job } from '@/lib/database.types';

/**
 * drainBatch is the one place both the worker and the cron route execute jobs,
 * so what matters here is the contract they both rely on: every claimed job
 * ends up either completed or failed, and one bad job does not strand the rest
 * of the batch.
 */

const claimJobs = vi.fn<(workerId: string, batchSize?: number) => Promise<Job[]>>();
const completeJob = vi.fn<(jobId: number) => Promise<void>>();
const failJob = vi.fn<(job: Job, cause: unknown) => Promise<void>>();

vi.mock('./jobs', () => ({
  claimJobs: (...args: Parameters<typeof claimJobs>) => claimJobs(...args),
  completeJob: (...args: Parameters<typeof completeJob>) => completeJob(...args),
  failJob: (...args: Parameters<typeof failJob>) => failJob(...args),
  // register-all pulls in the flow handler, which imports enqueue at load time.
  enqueue: vi.fn(),
  reapStalledJobs: vi.fn(),
}));

const { drainBatch, newWorkerId } = await import('./drain');
const { registerHandler } = await import('./handlers');

const handler = vi.fn<(job: Job) => Promise<void>>();
// 'message.send' has no real handler yet, so claiming it here collides with
// nothing that register-all already registered.
registerHandler('message.send', handler);

function job(id: number, type = 'message.send'): Job {
  return {
    id,
    workspace_id: '00000000-0000-0000-0000-000000000001',
    type,
    payload: {},
    status: 'running',
    run_at: '2026-01-01T00:00:00.000Z',
    attempts: 1,
    max_attempts: 5,
    locked_at: null,
    locked_by: null,
    last_error: null,
    dedupe_key: null,
    created_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  handler.mockResolvedValue(undefined);
  completeJob.mockResolvedValue(undefined);
  failJob.mockResolvedValue(undefined);
});

describe('drainBatch', () => {
  it('reports an empty queue without touching a handler', async () => {
    claimJobs.mockResolvedValue([]);

    const result = await drainBatch({ workerId: 'test' });

    expect(result).toEqual({ claimed: 0, completed: 0, failed: 0 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs each claimed job and marks it completed', async () => {
    claimJobs.mockResolvedValue([job(1), job(2)]);

    const result = await drainBatch({ workerId: 'test' });

    expect(result).toEqual({ claimed: 2, completed: 2, failed: 0 });
    expect(handler).toHaveBeenCalledTimes(2);
    expect(completeJob.mock.calls.map(([id]) => id)).toEqual([1, 2]);
    expect(failJob).not.toHaveBeenCalled();
  });

  it('fails a job whose handler throws, and keeps draining the batch', async () => {
    claimJobs.mockResolvedValue([job(1), job(2), job(3)]);
    handler.mockRejectedValueOnce(new Error('channel unreachable'));

    const result = await drainBatch({ workerId: 'test' });

    expect(result).toEqual({ claimed: 3, completed: 2, failed: 1 });
    expect(failJob).toHaveBeenCalledTimes(1);
    expect(failJob.mock.calls[0][0].id).toBe(1);
    expect((failJob.mock.calls[0][1] as Error).message).toBe('channel unreachable');
    // The two jobs behind the failure still ran.
    expect(completeJob.mock.calls.map(([id]) => id)).toEqual([2, 3]);
  });

  it('fails rather than silently completes a job with no registered handler', async () => {
    claimJobs.mockResolvedValue([job(9, 'campaign.dispatch')]);

    const result = await drainBatch({ workerId: 'test' });

    expect(result).toEqual({ claimed: 1, completed: 0, failed: 1 });
    expect(completeJob).not.toHaveBeenCalled();
    expect((failJob.mock.calls[0][1] as Error).message).toMatch(/no handler registered/i);
  });

  it('passes the batch size through to the claim', async () => {
    claimJobs.mockResolvedValue([]);

    await drainBatch({ workerId: 'w-1', batchSize: 25 });

    expect(claimJobs).toHaveBeenCalledWith('w-1', 25);
  });

  it('reports each outcome to onJob so callers can log in their own format', async () => {
    claimJobs.mockResolvedValue([job(1), job(2)]);
    handler.mockRejectedValueOnce(new Error('boom'));
    const seen: string[] = [];

    await drainBatch({
      workerId: 'test',
      onJob: (outcome) => seen.push(`${outcome.job.id}:${outcome.status}:${outcome.error ?? ''}`),
    });

    expect(seen).toEqual(['1:failed:boom', '2:completed:']);
  });
});

describe('newWorkerId', () => {
  it('distinguishes concurrent drainers so reaping can attribute a stuck job', () => {
    expect(newWorkerId('drain')).not.toBe(newWorkerId('drain'));
    expect(newWorkerId('drain')).toMatch(/^drain-\d+-[0-9a-f]{8}$/);
  });
});
