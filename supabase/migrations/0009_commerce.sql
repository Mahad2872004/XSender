-- xSender · Schema v3 · Commerce
--
-- What the business actually sells, and what customers commit to. Two shapes,
-- deliberately separate:
--
--   orders   — cart-based. Constraint is stock and fulfilment.
--   bookings — slot-based. Constraint is a resource's time.
--
-- A restaurant needs both (takeaway and tables); a clinic only the second.
-- Money is stored in minor units (paisa, cents) as integers — never floats.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.catalog_item_type as enum ('menu_item', 'product', 'service');

create type public.order_status as enum (
  'pending',          -- captured, not yet accepted by the business
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled'
);

create type public.fulfillment_type as enum ('delivery', 'pickup', 'dine_in');

create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');

create type public.payment_method as enum ('cash', 'card', 'wallet', 'bank_transfer', 'online');

create type public.resource_type as enum ('table', 'staff', 'room', 'property', 'other');

create type public.booking_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
);

-- ---------------------------------------------------------------------------
-- Catalog — the menu, product list, or service list a flow reads from.
-- ---------------------------------------------------------------------------

create table public.catalog_categories (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null,
  description   text,
  sort_order    integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index catalog_categories_workspace_idx
  on public.catalog_categories (workspace_id, sort_order);

create trigger catalog_categories_set_updated_at
  before update on public.catalog_categories
  for each row execute function public.set_updated_at();

create table public.catalog_items (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  category_id   uuid references public.catalog_categories (id) on delete set null,

  type          public.catalog_item_type not null default 'menu_item',
  name          text not null,
  description   text,

  -- Minor units. 750 rupees is 75000.
  price_minor   integer not null default 0,
  currency      text not null default 'PKR',

  photo_url     text,
  available     boolean not null default true,
  sort_order    integer not null default 0,
  sku           text,

  -- How long a service occupies its resource. Null for products.
  duration_minutes integer,

  -- Variants and add-ons: [{name, choices:[{label, priceDeltaMinor}]}]
  options       jsonb not null default '[]'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index catalog_items_workspace_idx on public.catalog_items (workspace_id, sort_order);
create index catalog_items_category_idx on public.catalog_items (category_id);
-- The lookup a flow's catalog_browse node makes on every conversation.
create index catalog_items_available_idx
  on public.catalog_items (workspace_id, category_id)
  where available;

create trigger catalog_items_set_updated_at
  before update on public.catalog_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

-- Human-facing order numbers are per workspace, so one client cannot infer
-- another's volume from their order codes.
alter table public.workspaces
  add column if not exists order_counter integer not null default 1000;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  contact_id      uuid not null references public.contacts (id) on delete cascade,
  -- Which conversation produced it; null for orders keyed in by staff.
  conversation_id uuid references public.conversations (id) on delete set null,

  -- Customer-facing, e.g. XS-1042.
  code            text not null,
  status          public.order_status not null default 'pending',

  fulfillment     public.fulfillment_type not null default 'delivery',
  address         text,
  -- Shared location pin, when the customer sends one instead of typing.
  latitude        double precision,
  longitude       double precision,
  scheduled_for   timestamptz,

  payment_method  public.payment_method,
  payment_status  public.payment_status not null default 'unpaid',
  payment_reference text,

  subtotal_minor  integer not null default 0,
  delivery_fee_minor integer not null default 0,
  total_minor     integer not null default 0,
  currency        text not null default 'PKR',

  notes           text,
  -- 'flow' when the bot captured it with no human involved — this is what the
  -- ROI panel counts.
  placed_by       text not null default 'flow',

  rating          integer check (rating between 1 and 5),
  rated_at        timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,

  unique (workspace_id, code)
);

create index orders_workspace_idx on public.orders (workspace_id, created_at desc);
create index orders_contact_idx on public.orders (contact_id, created_at desc);
create index orders_open_idx
  on public.orders (workspace_id, status)
  where status not in ('completed', 'cancelled');

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  order_id        uuid not null references public.orders (id) on delete cascade,
  -- Nulled if the item is later removed from the menu; the snapshot below is
  -- what the order actually was.
  catalog_item_id uuid references public.catalog_items (id) on delete set null,

  -- Snapshots, so editing the menu never rewrites past orders.
  name            text not null,
  unit_price_minor integer not null,
  quantity        integer not null default 1 check (quantity > 0),
  line_total_minor integer not null,
  selected_options jsonb not null default '[]'::jsonb,

  created_at      timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- Allocate the next per-workspace order code atomically.
create or replace function public.next_order_code(ws uuid)
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  update public.workspaces
  set order_counter = order_counter + 1
  where id = ws
  returning order_counter into v_next;

  if v_next is null then
    raise exception 'Unknown workspace %', ws;
  end if;

  return 'XS-' || v_next::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resources and availability — what a booking consumes.
-- ---------------------------------------------------------------------------

create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  type          public.resource_type not null default 'other',
  name          text not null,
  description   text,
  -- Covers for a table, concurrent appointments for a clinician.
  capacity      integer not null default 1 check (capacity > 0),
  active        boolean not null default true,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index resources_workspace_idx on public.resources (workspace_id) where active;

create trigger resources_set_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();

create table public.availability_rules (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  resource_id   uuid not null references public.resources (id) on delete cascade,
  -- 0 = Sunday, matching PostgreSQL's extract(dow).
  weekday       smallint not null check (weekday between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  slot_minutes  integer not null default 30 check (slot_minutes > 0),
  created_at    timestamptz not null default now(),
  check (end_time > start_time)
);

create index availability_rules_resource_idx
  on public.availability_rules (resource_id, weekday);

-- Holidays, and one-off changes to opening hours.
create table public.availability_exceptions (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  resource_id   uuid not null references public.resources (id) on delete cascade,
  on_date       date not null,
  closed        boolean not null default true,
  start_time    time,
  end_time      time,
  reason        text,
  created_at    timestamptz not null default now(),
  unique (resource_id, on_date)
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------

create table public.bookings (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  contact_id      uuid not null references public.contacts (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  resource_id     uuid references public.resources (id) on delete set null,
  -- What was booked, when it maps to a catalog service.
  catalog_item_id uuid references public.catalog_items (id) on delete set null,

  code            text not null,
  status          public.booking_status not null default 'confirmed',

  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  party_size      integer check (party_size > 0),
  notes           text,

  reminder_sent_at timestamptz,
  placed_by       text not null default 'flow',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (workspace_id, code),
  check (ends_at > starts_at)
);

create index bookings_workspace_idx on public.bookings (workspace_id, starts_at);
create index bookings_contact_idx on public.bookings (contact_id, starts_at desc);
create index bookings_resource_idx on public.bookings (resource_id, starts_at);

-- Reminders are found by scanning upcoming, un-reminded bookings.
create index bookings_reminder_idx
  on public.bookings (starts_at)
  where reminder_sent_at is null and status = 'confirmed';

/*
 * Double-booking prevention, enforced by the database rather than application
 * code. Two live bookings cannot overlap on the same resource — a check that
 * survives the race between two customers confirming the same slot at once,
 * which application-level checking cannot win.
 *
 * This applies to every resource regardless of `capacity`, because capacity
 * means how many people the resource holds (seats at a table), not how many
 * bookings it can take at once. availableSlots() in bookings.ts must use the
 * same rule, or it will offer slots this constraint then rejects.
 */
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    resource_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status in ('pending', 'confirmed') and resource_id is not null);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create or replace function public.next_booking_code(ws uuid)
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  update public.workspaces
  set order_counter = order_counter + 1
  where id = ws
  returning order_counter into v_next;

  if v_next is null then
    raise exception 'Unknown workspace %', ws;
  end if;

  return 'BK-' || v_next::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.catalog_categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.resources enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;

create policy "read categories in your workspace"
  on public.catalog_categories for select using (public.is_workspace_member(workspace_id));
create policy "read items in your workspace"
  on public.catalog_items for select using (public.is_workspace_member(workspace_id));
create policy "read orders in your workspace"
  on public.orders for select using (public.is_workspace_member(workspace_id));
create policy "read order items in your workspace"
  on public.order_items for select using (public.is_workspace_member(workspace_id));
create policy "read resources in your workspace"
  on public.resources for select using (public.is_workspace_member(workspace_id));
create policy "read availability rules in your workspace"
  on public.availability_rules for select using (public.is_workspace_member(workspace_id));
create policy "read availability exceptions in your workspace"
  on public.availability_exceptions for select using (public.is_workspace_member(workspace_id));
create policy "read bookings in your workspace"
  on public.bookings for select using (public.is_workspace_member(workspace_id));

-- The Orders board updates live as staff advance statuses.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.bookings;
