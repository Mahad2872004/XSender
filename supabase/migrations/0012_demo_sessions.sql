-- xSender · Anonymous demo sessions
--
-- The homepage demo lets a visitor order from the real engine without signing
-- up. That means a public, unauthenticated write path, so it needs its own
-- accounting: who is talking, how much they have said, and enough signal to
-- shut down abuse without a Redis instance in the way.
--
-- Sessions live in a dedicated demo workspace. Nothing here can reach a
-- customer's data — the tenancy guard still applies, and the workspace it
-- writes to contains only seeded demo content.

create table public.demo_sessions (
  id              uuid primary key default gen_random_uuid(),
  -- Random token held in an httpOnly cookie. Not a secret worth much; it only
  -- identifies which throwaway conversation a browser owns.
  token           text not null unique,

  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  contact_id      uuid not null references public.contacts (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,

  -- Hashed, never the raw address: this is a marketing page, and the only
  -- question we need answered is "is this the same abuser again".
  ip_hash         text,

  message_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index demo_sessions_ip_idx on public.demo_sessions (ip_hash, created_at desc);
create index demo_sessions_stale_idx on public.demo_sessions (last_message_at);

-- Server-only. RLS on with no policy means anon and authenticated can read
-- nothing; the demo route uses the service role.
alter table public.demo_sessions enable row level security;

/**
 * Remove demo conversations that have gone quiet.
 *
 * Without this the demo workspace grows without limit, and stale sessions are
 * worthless the moment a visitor closes the tab. Deleting the contact cascades
 * to its conversation, messages and flow runs.
 */
create or replace function public.reap_demo_sessions(older_than interval default interval '2 hours')
returns integer
language plpgsql
as $$
declare
  reaped integer;
begin
  with stale as (
    delete from public.demo_sessions
    where last_message_at < now() - older_than
    returning contact_id
  )
  delete from public.contacts c
  using stale
  where c.id = stale.contact_id;

  get diagnostics reaped = row_count;
  return reaped;
end;
$$;
