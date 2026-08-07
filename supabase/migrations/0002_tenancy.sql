-- xSender · Schema v1 · Tenancy
-- One workspace per client business. Every tenant table carries workspace_id.

-- ---------------------------------------------------------------------------
-- profiles — mirrors auth.users so the app can join on user data.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- workspaces — the tenant boundary.
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  vertical    public.business_vertical not null default 'other',
  timezone    text not null default 'Asia/Karachi',
  currency    text not null default 'PKR',
  -- Free-form per-workspace configuration: ROI assumptions, business hours,
  -- branding, onboarding checklist progress.
  settings    jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workspace_members — who can see what, and with which role.
-- ---------------------------------------------------------------------------

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          public.workspace_role not null default 'agent',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

create trigger workspace_members_set_updated_at
  before update on public.workspace_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers.
--
-- These are SECURITY DEFINER on purpose: an RLS policy on workspace_members
-- that queries workspace_members would recurse infinitely. Running the lookup
-- with the definer's rights bypasses RLS and breaks the cycle.
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(ws uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.workspace_members m
  where m.workspace_id = ws
    and m.user_id = auth.uid();
$$;

-- Can the current user administer this workspace (owner or admin)?
create or replace function public.can_admin_workspace(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role_of(ws) in ('owner', 'admin');
$$;

-- ---------------------------------------------------------------------------
-- RLS
--
-- The application backend uses the service-role key and enforces tenancy in
-- src/server/db/tenancy.ts. These policies are defense-in-depth for anything
-- the browser touches directly — chiefly Supabase Realtime subscriptions.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create policy "read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "read workspaces you belong to"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "admins update their workspace"
  on public.workspaces for update
  using (public.can_admin_workspace(id))
  with check (public.can_admin_workspace(id));

create policy "read members of your workspaces"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));
