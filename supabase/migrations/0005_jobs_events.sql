-- xSender · Schema v1 · Job queue and event log
-- Vercel has no long-running execution, so everything delayed, scheduled,
-- retried or batched goes through this table and the worker/ process.

-- ---------------------------------------------------------------------------
-- jobs — a Postgres queue claimed with FOR UPDATE SKIP LOCKED.
-- ---------------------------------------------------------------------------

create table public.jobs (
  id            bigserial primary key,
  workspace_id  uuid references public.workspaces (id) on delete cascade,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,

  status        public.job_status not null default 'pending',
  run_at        timestamptz not null default now(),
  attempts      integer not null default 0,
  max_attempts  integer not null default 5,

  -- Set while a worker holds the job, so a crashed worker's jobs can be
  -- reclaimed by reap_stalled_jobs().
  locked_at     timestamptz,
  locked_by     text,

  last_error    text,
  -- Optional caller-supplied key that makes enqueueing idempotent, e.g.
  -- 'booking-reminder:<booking_id>' so a re-run cannot double-schedule.
  dedupe_key    text,

  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

-- The claim query's covering index: pending jobs that are due, oldest first.
create index jobs_claimable_idx
  on public.jobs (run_at, id)
  where status = 'pending';

create index jobs_workspace_idx on public.jobs (workspace_id, created_at desc);

create unique index jobs_dedupe_key_active
  on public.jobs (dedupe_key)
  where dedupe_key is not null and status in ('pending', 'running');

-- Atomically claim a batch. SKIP LOCKED lets several workers run concurrently
-- without any of them blocking on the others' rows.
create or replace function public.claim_jobs(
  worker_id text,
  batch_size integer default 10
)
returns setof public.jobs
language plpgsql
as $$
begin
  return query
  with claimed as (
    select j.id
    from public.jobs j
    where j.status = 'pending'
      and j.run_at <= now()
    order by j.run_at, j.id
    limit batch_size
    for update skip locked
  )
  update public.jobs j
  set status = 'running',
      locked_at = now(),
      locked_by = worker_id,
      attempts = j.attempts + 1
  from claimed
  where j.id = claimed.id
  returning j.*;
end;
$$;

-- Return jobs abandoned by a dead worker to the queue.
create or replace function public.reap_stalled_jobs(stall_after interval default interval '5 minutes')
returns integer
language plpgsql
as $$
declare
  reaped integer;
begin
  update public.jobs
  set status = case when attempts >= max_attempts then 'dead'::public.job_status
                    else 'pending'::public.job_status end,
      locked_at = null,
      locked_by = null,
      last_error = coalesce(last_error, 'reclaimed from stalled worker')
  where status = 'running'
    and locked_at < now() - stall_after;

  get diagnostics reaped = row_count;
  return reaped;
end;
$$;

-- ---------------------------------------------------------------------------
-- events — the audit trail and the ROI spine.
--
-- Every automated interaction writes a row here. The Dashboard's "hours saved /
-- rupees saved" figure is derived from these, so this table is a product
-- feature, not just logging.
-- ---------------------------------------------------------------------------

create table public.events (
  id            bigserial primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  -- Dotted namespace: 'automation.message_handled', 'automation.handoff',
  -- 'order.created', 'booking.confirmed', 'channel.connected'.
  type          text not null,
  entity_type   text,
  entity_id     uuid,
  actor_user_id uuid references auth.users (id) on delete set null,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index events_workspace_type_idx
  on public.events (workspace_id, type, created_at desc);
create index events_entity_idx
  on public.events (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- webhook_deliveries — raw inbound payloads, kept for replay and debugging.
-- ---------------------------------------------------------------------------

create table public.webhook_deliveries (
  id            bigserial primary key,
  source        text not null,            -- 'meta', 'safepay', ...
  workspace_id  uuid references public.workspaces (id) on delete set null,
  signature_ok  boolean not null,
  headers       jsonb not null default '{}'::jsonb,
  body          jsonb not null,
  processed_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);

create index webhook_deliveries_created_idx
  on public.webhook_deliveries (source, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
--
-- jobs and webhook_deliveries are server-only: RLS is enabled with no select
-- policy, so the anon/authenticated roles can read nothing. The service role
-- bypasses RLS entirely and is what worker/ and src/server/** use.
-- ---------------------------------------------------------------------------

alter table public.jobs enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.events enable row level security;

create policy "read events in your workspace"
  on public.events for select
  using (public.is_workspace_member(workspace_id));
