-- xSender · Schema v10 · Scheduled queue drain
--
-- worker/index.ts is the reference way to drain the jobs table, but it needs a
-- process that stays up. A serverless-only deployment has none, so pg_cron
-- calls the app once a minute and each call drains a batch through the same
-- code path (src/app/api/jobs/drain/route.ts).
--
-- Skip this migration if you run the worker: two drainers are safe (claim_jobs
-- takes rows FOR UPDATE SKIP LOCKED) but the cron is then just noise.
--
-- ---------------------------------------------------------------------------
-- One-time setup, per environment, BEFORE this schedule does anything useful.
-- The URL and secret are configuration rather than schema, so they live in
-- Vault instead of in this file:
--
--   select vault.create_secret(
--     'https://<your-app>.vercel.app/api/jobs/drain', 'queue_drain_url');
--   select vault.create_secret(
--     '<same value as QUEUE_DRAIN_SECRET on the host>', 'queue_drain_secret');
--
-- Until both exist the scheduled call posts to a null URL and records an error
-- every minute in cron.job_run_details — visible, not silent.
-- ---------------------------------------------------------------------------

do $$
declare
  -- Every statement touching the cron schema goes through EXECUTE: on a first
  -- install that schema does not exist until the CREATE EXTENSION below, and a
  -- direct reference would be resolved too early.
  drain_command constant text := $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets
              where name = 'queue_drain_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-queue-secret', (select decrypted_secret from vault.decrypted_secrets
                           where name = 'queue_drain_secret')
      ),
      body := '{}'::jsonb,
      -- pg_net is fire-and-forget; this only bounds how long it holds the
      -- response it discards.
      timeout_milliseconds := 55000
    );
  $cron$;
begin
  -- Local Postgres and some hosts ship without these. Skipping keeps
  -- `supabase db reset` working there; those environments run the worker.
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from pg_available_extensions where name = 'pg_net')
  then
    raise notice 'pg_cron/pg_net unavailable — skipping the scheduled queue drain.';
    return;
  end if;

  execute 'create extension if not exists pg_cron';
  execute 'create extension if not exists pg_net';

  -- Re-running the migration should replace the schedule, not fail on it.
  -- Matching zero rows is the first-install case and simply does nothing.
  execute $sql$
    select cron.unschedule(jobid) from cron.job where jobname = 'xsender-drain-queue'
  $sql$;

  -- Every minute is pg_cron's standard floor, so a delay node fires within a
  -- minute of its run_at — well inside the tolerance for the hour-scale waits
  -- flows actually use.
  execute format(
    'select cron.schedule(%L, %L, %L)',
    'xsender-drain-queue',
    '* * * * *',
    drain_command
  );
end
$$;
