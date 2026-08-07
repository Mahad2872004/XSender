-- xSender · Schema v2 · Automation flows
--
-- A flow is a directed graph stored as JSON. Editing produces draft versions;
-- publishing pins one. A flow_run is one conversation's position in a published
-- version — the engine is a state machine, so a run is just "which node am I on
-- and what have I collected so far".

create type public.flow_status as enum ('draft', 'published', 'archived');

create type public.flow_run_status as enum (
  'running',          -- executing right now
  'awaiting_input',   -- parked, waiting for the customer to reply
  'sleeping',         -- parked until resume_at (delay / wait_until)
  'completed',
  'failed',
  'cancelled'         -- superseded, or handed to a human who ended it
);

-- ---------------------------------------------------------------------------
-- flows + versions
-- ---------------------------------------------------------------------------

create table public.flows (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null,
  description   text,
  -- Which vertical's template this came from; null for a flow built from blank.
  vertical      public.business_vertical,
  status        public.flow_status not null default 'draft',

  -- What starts this flow. Shape validated by TriggerConfigSchema in
  -- src/lib/schemas/flow.ts — e.g. {"type":"message_received","match":"first_contact"}.
  trigger       jsonb not null default '{"type":"message_received","match":"any"}'::jsonb,

  -- Lower runs first when several flows could match the same inbound message.
  priority      integer not null default 100,

  published_version_id uuid,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index flows_workspace_idx on public.flows (workspace_id);
create index flows_published_idx
  on public.flows (workspace_id, priority)
  where status = 'published';

create trigger flows_set_updated_at
  before update on public.flows
  for each row execute function public.set_updated_at();

create table public.flow_versions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  flow_id       uuid not null references public.flows (id) on delete cascade,
  version       integer not null,

  -- {"nodes":[{id,type,position,config}], "edges":[{id,source,sourceHandle,target}]}
  graph         jsonb not null,
  -- Which node execution starts from.
  entry_node_id text not null,

  notes         text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (flow_id, version)
);

create index flow_versions_flow_idx on public.flow_versions (flow_id, version desc);

alter table public.flows
  add constraint flows_published_version_fk
  foreign key (published_version_id) references public.flow_versions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- flow_runs — one conversation's progress through one version.
--
-- Runs stay pinned to the version they started on. Publishing mid-conversation
-- must not move a customer to a different graph half-way through checkout.
-- ---------------------------------------------------------------------------

create table public.flow_runs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  flow_id         uuid not null references public.flows (id) on delete cascade,
  flow_version_id uuid not null references public.flow_versions (id) on delete cascade,

  status          public.flow_run_status not null default 'running',
  current_node_id text,

  -- What the parked node expects next, e.g.
  -- {"nodeId":"ask_size","kind":"buttons","options":["small","large"],"attempts":1}
  awaiting        jsonb,

  -- Everything collected so far: answers, cart contents, computed values.
  variables       jsonb not null default '{}'::jsonb,

  -- Set for 'sleeping' runs; the worker picks these up.
  resume_at       timestamptz,

  -- Guards against a cycle in the graph burning through the queue.
  steps_taken     integer not null default 0,

  error           text,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  updated_at      timestamptz not null default now()
);

create index flow_runs_conversation_idx on public.flow_runs (conversation_id);

-- The worker's wake-up query.
create index flow_runs_resume_idx
  on public.flow_runs (resume_at)
  where status = 'sleeping';

-- One live run per conversation. A second flow cannot hijack a customer who is
-- half-way through ordering.
create unique index flow_runs_one_active_per_conversation
  on public.flow_runs (conversation_id)
  where status in ('running', 'awaiting_input', 'sleeping');

create trigger flow_runs_set_updated_at
  before update on public.flow_runs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- flow_run_steps — the run inspector's data, and the answer to "why did the
-- bot say that?". Cheap to write, and the only way to debug a live flow.
-- ---------------------------------------------------------------------------

create table public.flow_run_steps (
  id            bigserial primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  flow_run_id   uuid not null references public.flow_runs (id) on delete cascade,
  node_id       text not null,
  node_type     text not null,
  -- 'entered' | 'advanced' | 'awaited' | 'resumed' | 'slept' | 'ended' | 'failed'
  outcome       text not null,
  -- Branch taken, message sent, variables written, error detail.
  detail        jsonb not null default '{}'::jsonb,
  duration_ms   integer,
  created_at    timestamptz not null default now()
);

create index flow_run_steps_run_idx on public.flow_run_steps (flow_run_id, id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.flows enable row level security;
alter table public.flow_versions enable row level security;
alter table public.flow_runs enable row level security;
alter table public.flow_run_steps enable row level security;

create policy "read flows in your workspace"
  on public.flows for select
  using (public.is_workspace_member(workspace_id));

create policy "read flow versions in your workspace"
  on public.flow_versions for select
  using (public.is_workspace_member(workspace_id));

create policy "read flow runs in your workspace"
  on public.flow_runs for select
  using (public.is_workspace_member(workspace_id));

create policy "read flow run steps in your workspace"
  on public.flow_run_steps for select
  using (public.is_workspace_member(workspace_id));

-- The simulator and the run inspector both watch runs live.
alter publication supabase_realtime add table public.flow_runs;
