-- xSender · Schema v1 · Contacts, conversations, messages
-- The messaging spine. One contact may reach the business on several channels;
-- contact_identities is what merges those into a single customer record.

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  full_name     text,
  phone         text,          -- E.164 when known
  email         text,
  -- Vertical-specific fields captured by flows (party size preference,
  -- property budget, allergy notes...).
  attributes    jsonb not null default '{}'::jsonb,
  tags          text[] not null default '{}',
  notes         text,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_workspace_phone_idx on public.contacts (workspace_id, phone);
create index contacts_tags_idx on public.contacts using gin (tags);

create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_identities — one row per (channel, external id) this contact uses.
-- ---------------------------------------------------------------------------

create table public.contact_identities (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  contact_id    uuid not null references public.contacts (id) on delete cascade,
  channel_type  public.channel_type not null,
  -- WhatsApp wa_id, Instagram-scoped user id, or Messenger PSID.
  external_id   text not null,
  display_name  text,
  created_at    timestamptz not null default now(),
  -- The same external id cannot belong to two contacts within a workspace.
  unique (workspace_id, channel_type, external_id)
);

create index contact_identities_contact_idx on public.contact_identities (contact_id);

-- ---------------------------------------------------------------------------
-- conversations — one open thread per (contact, channel).
-- ---------------------------------------------------------------------------

create table public.conversations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  contact_id    uuid not null references public.contacts (id) on delete cascade,
  channel_id    uuid not null references public.channels (id) on delete cascade,
  status        public.conversation_status not null default 'open',

  -- Set by the handoff_to_human node; pauses automation and pulls the thread
  -- to the top of the Inbox.
  needs_human   boolean not null default false,
  assigned_to   uuid references auth.users (id) on delete set null,

  -- Meta's 24-hour customer service window. Refreshed on every inbound message.
  -- Outside it, only approved templates may be sent — enforced by the flow
  -- engine, see src/server/channels/window.ts.
  window_expires_at timestamptz,

  last_message_at   timestamptz,
  last_message_preview text,
  unread_count      integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index conversations_workspace_idx
  on public.conversations (workspace_id, last_message_at desc nulls last);
create index conversations_contact_idx on public.conversations (contact_id);
create index conversations_needs_human_idx
  on public.conversations (workspace_id)
  where needs_human;

-- At most one live thread per contact per channel; resolved ones may accumulate.
create unique index conversations_one_open_per_contact_channel
  on public.conversations (contact_id, channel_id)
  where status <> 'resolved';

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  direction       public.message_direction not null,
  author          public.message_author not null,
  -- The agent or system user who sent it, when author = 'agent'.
  author_user_id  uuid references auth.users (id) on delete set null,

  -- Normalised content, shaped by the MessagePayload union in
  -- src/lib/schemas/message.ts — text, media, buttons, list, template, location.
  payload         jsonb not null,

  status          public.message_status not null default 'queued',
  -- Meta's message id (wamid...), used to match delivery/read status webhooks.
  external_id     text,
  error           text,

  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx
  on public.messages (conversation_id, created_at desc);
create index messages_workspace_created_idx
  on public.messages (workspace_id, created_at desc);

-- Meta retries webhooks; this makes duplicate inbound delivery a no-op.
create unique index messages_external_id_key
  on public.messages (workspace_id, external_id)
  where external_id is not null;

-- ---------------------------------------------------------------------------
-- Keep conversation summary columns in sync with the latest message.
-- ---------------------------------------------------------------------------

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations c
  set
    last_message_at = greatest(coalesce(c.last_message_at, new.created_at), new.created_at),
    last_message_preview = left(coalesce(new.payload ->> 'text', '[' || coalesce(new.payload ->> 'type', 'message') || ']'), 160),
    unread_count = case
      when new.direction = 'inbound' then c.unread_count + 1
      else c.unread_count
    end,
    -- Every inbound message reopens Meta's 24-hour service window.
    window_expires_at = case
      when new.direction = 'inbound' then new.created_at + interval '24 hours'
      else c.window_expires_at
    end
  where c.id = new.conversation_id;

  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- ---------------------------------------------------------------------------
-- RLS · these three tables are what the Inbox subscribes to over Realtime.
-- ---------------------------------------------------------------------------

alter table public.contacts enable row level security;
alter table public.contact_identities enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "read contacts in your workspace"
  on public.contacts for select
  using (public.is_workspace_member(workspace_id));

create policy "read contact identities in your workspace"
  on public.contact_identities for select
  using (public.is_workspace_member(workspace_id));

create policy "read conversations in your workspace"
  on public.conversations for select
  using (public.is_workspace_member(workspace_id));

create policy "read messages in your workspace"
  on public.messages for select
  using (public.is_workspace_member(workspace_id));

-- Realtime only streams changes for tables in this publication.
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;
