-- xSender · Schema v1 · Channels
-- A channel is one connected messaging surface for one workspace: a WhatsApp
-- number, an Instagram account, a Facebook page, or the built-in simulator.

create table public.channels (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  type          public.channel_type not null,
  status        public.channel_status not null default 'disconnected',

  -- Human label shown in the UI ("Main line", "@cafedelight").
  display_name  text not null,

  -- Meta identifiers. Which of these are populated depends on `type`.
  waba_id           text,   -- WhatsApp Business Account
  phone_number_id   text,   -- WhatsApp Cloud API sending identity
  phone_number      text,   -- E.164, for display
  ig_user_id        text,   -- Instagram professional account
  page_id           text,   -- Facebook page (Messenger, and IG's linked page)
  business_id       text,   -- Meta Business portfolio

  -- Long-lived access token, AES-256-GCM encrypted at rest by
  -- src/server/crypto/secrets.ts. Never store plaintext here.
  access_token_ciphertext text,
  token_expires_at        timestamptz,

  -- Last error surfaced by the Graph API, so the UI can prompt for re-auth
  -- instead of failing silently.
  last_error    text,
  last_error_at timestamptz,

  connected_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index channels_workspace_idx on public.channels (workspace_id);

-- Webhook routing: an inbound Meta payload names a phone_number_id / ig_user_id
-- / page_id, and we must resolve it to exactly one channel across all tenants.
create unique index channels_phone_number_id_key
  on public.channels (phone_number_id)
  where phone_number_id is not null;

create unique index channels_ig_user_id_key
  on public.channels (ig_user_id)
  where ig_user_id is not null;

create unique index channels_page_id_key
  on public.channels (page_id)
  where page_id is not null;

-- Exactly one simulator channel per workspace, created on signup.
create unique index channels_one_simulator_per_workspace
  on public.channels (workspace_id)
  where type = 'simulator';

create trigger channels_set_updated_at
  before update on public.channels
  for each row execute function public.set_updated_at();

alter table public.channels enable row level security;

create policy "read channels in your workspace"
  on public.channels for select
  using (public.is_workspace_member(workspace_id));

-- RLS filters rows, not columns — the policy above would otherwise hand the
-- encrypted token to any workspace member's browser. Revoke the secret columns
-- at the column level; the service role used by src/server/** is unaffected.
revoke select (access_token_ciphertext, token_expires_at)
  on public.channels
  from anon, authenticated;
