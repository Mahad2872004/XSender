-- xSender · ROI summary
--
-- The dashboard's hero figure — hours saved — is the product's whole argument,
-- so it has to be defensible line by line. Everything here is derived from rows
-- that exist because a real customer sent a real message; there is no seeded or
-- assumed volume anywhere in these functions. The single assumption in the
-- calculation (how long a person takes to answer one message) lives in
-- workspaces.settings, is shown on the screen, and is editable by the owner.
--
-- The unit of work is a TURN, not a message.
--
-- A turn is one inbound customer message plus everything that followed it before
-- the customer wrote again. Counting turns rather than outbound messages matters:
-- a flow often replies with three bubbles where a person would have typed one, so
-- counting bot messages would inflate the headline by roughly 3x. A turn is
-- exactly the thing a member of staff would have had to read and answer, which
-- makes "hours saved" a claim that survives being checked.

-- ---------------------------------------------------------------------------
-- Shared turn classification.
--
-- Returns one row per turn with who answered it. `turn` numbers from 1 within
-- each conversation; anything before the first inbound message (a campaign
-- send, say) lands in turn 0 and is excluded — nobody was waiting on it.
-- ---------------------------------------------------------------------------

create or replace function public.roi_turns(
  p_workspace uuid,
  p_from      timestamptz,
  p_to        timestamptz
)
returns table (
  conversation_id uuid,
  turn            bigint,
  started_at      timestamptz,
  bot_replied     boolean,
  agent_replied   boolean
)
language sql
stable
as $$
  with ordered as (
    select
      m.conversation_id,
      m.created_at,
      m.direction,
      m.author,
      count(*) filter (where m.direction = 'inbound') over (
        partition by m.conversation_id
        order by m.created_at, m.id
        rows between unbounded preceding and current row
      ) as turn
    from public.messages m
    where m.workspace_id = p_workspace
      and m.created_at >= p_from
      and m.created_at <  p_to
  )
  select
    o.conversation_id,
    o.turn,
    min(o.created_at) filter (where o.direction = 'inbound') as started_at,
    bool_or(o.author = 'flow')  as bot_replied,
    bool_or(o.author = 'agent') as agent_replied
  from ordered o
  where o.turn > 0
  group by o.conversation_id, o.turn;
$$;

-- ---------------------------------------------------------------------------
-- roi_summary — one row, everything the dashboard's headline needs.
-- ---------------------------------------------------------------------------

create or replace function public.roi_summary(
  p_workspace uuid,
  p_from      timestamptz,
  p_to        timestamptz
)
returns table (
  -- Turns the automation answered with no human involved. This is the number
  -- hours saved is calculated from.
  turns_automated       bigint,
  -- Turns a person answered, whether or not the bot also spoke.
  turns_by_person       bigint,
  inbound_messages      bigint,
  outbound_bot_messages bigint,
  conversations_total   bigint,
  conversations_automated bigint,
  handoffs              bigint,
  orders_captured       bigint,
  orders_value_minor    bigint,
  bookings_captured     bigint,
  -- When this workspace's history begins, so the screen can say "since" rather
  -- than implying the window it happens to be showing is all there is.
  first_activity_at     timestamptz
)
language sql
stable
as $$
  with t as (
    select * from public.roi_turns(p_workspace, p_from, p_to)
  ),
  per_conversation as (
    select
      t.conversation_id,
      bool_or(t.agent_replied) as ever_agent
    from t
    group by t.conversation_id
  )
  select
    (select count(*) from t where t.bot_replied and not t.agent_replied),
    (select count(*) from t where t.agent_replied),

    (select count(*) from public.messages m
      where m.workspace_id = p_workspace
        and m.direction = 'inbound'
        and m.created_at >= p_from and m.created_at < p_to),

    (select count(*) from public.messages m
      where m.workspace_id = p_workspace
        and m.author = 'flow'
        and m.created_at >= p_from and m.created_at < p_to),

    (select count(*) from per_conversation),
    (select count(*) from per_conversation where not per_conversation.ever_agent),

    (select count(*) from public.events e
      where e.workspace_id = p_workspace
        and e.type = 'automation.handoff'
        and e.created_at >= p_from and e.created_at < p_to),

    (select count(*) from public.orders o
      where o.workspace_id = p_workspace
        and o.placed_by = 'flow'
        and o.status <> 'cancelled'
        and o.created_at >= p_from and o.created_at < p_to),

    (select coalesce(sum(o.total_minor), 0) from public.orders o
      where o.workspace_id = p_workspace
        and o.placed_by = 'flow'
        and o.status <> 'cancelled'
        and o.created_at >= p_from and o.created_at < p_to),

    (select count(*) from public.bookings b
      where b.workspace_id = p_workspace
        and b.placed_by = 'flow'
        and b.status <> 'cancelled'
        and b.created_at >= p_from and b.created_at < p_to),

    (select min(m.created_at) from public.messages m
      where m.workspace_id = p_workspace);
$$;

-- ---------------------------------------------------------------------------
-- roi_daily — the trend line.
--
-- Bucketed in the workspace's own timezone, because "Tuesday" has to mean the
-- business's Tuesday. Days with no activity are filled in by the caller so the
-- chart does not imply a quiet day never happened.
-- ---------------------------------------------------------------------------

create or replace function public.roi_daily(
  p_workspace uuid,
  p_from      timestamptz,
  p_to        timestamptz,
  p_timezone  text default 'UTC'
)
returns table (
  day             date,
  turns_automated bigint,
  turns_by_person bigint
)
language sql
stable
as $$
  select
    ((t.started_at at time zone p_timezone)::date) as day,
    count(*) filter (where t.bot_replied and not t.agent_replied),
    count(*) filter (where t.agent_replied)
  from public.roi_turns(p_workspace, p_from, p_to) t
  where t.started_at is not null
  group by 1
  order by 1;
$$;

-- These read across a whole workspace, so they are server-only: src/server/**
-- calls them with the service role after resolving membership itself. Letting a
-- browser call them directly would hand it a workspace id as an argument, which
-- is exactly the check the tenancy layer exists to perform.
revoke execute on function public.roi_turns(uuid, timestamptz, timestamptz)
  from anon, authenticated;
revoke execute on function public.roi_summary(uuid, timestamptz, timestamptz)
  from anon, authenticated;
revoke execute on function public.roi_daily(uuid, timestamptz, timestamptz, text)
  from anon, authenticated;
