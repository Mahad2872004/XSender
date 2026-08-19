-- xSender · Workspace locale and country
--
-- Needed once the audience stops sharing one country:
--
--   locale       decides how "03/04/2026" is read (3 April or 4 March), how
--                money and dates are rendered, and which language the bot's
--                own built-in phrases use.
--   country_code drives regional pricing and the country-specific Meta
--                conversation rates shown in the ROI figures.
--
-- Both default to a neutral value rather than a Pakistani one: the product is
-- sold globally and a default should not silently misread a US customer's
-- dates.

alter table public.workspaces
  add column if not exists locale text not null default 'en-US',
  add column if not exists country_code text;

comment on column public.workspaces.locale is
  'BCP 47 tag, e.g. en-US, en-GB, ur-PK, ar-AE. Drives date parsing order, '
  'number and currency formatting, and the bot''s built-in phrases.';

comment on column public.workspaces.country_code is
  'ISO 3166-1 alpha-2. Null until known. Drives regional pricing and Meta '
  'conversation rates.';

-- ---------------------------------------------------------------------------
-- Vertical becomes free text.
--
-- It was an enum with five values, so every new industry we sold to needed a
-- migration. The canonical list now lives in src/lib/verticals.ts and unknown
-- values degrade to the generic template rather than failing.
-- ---------------------------------------------------------------------------

alter table public.workspaces
  alter column vertical drop default;

alter table public.workspaces
  alter column vertical type text using vertical::text;

alter table public.workspaces
  alter column vertical set default 'other';

alter table public.flows
  alter column vertical type text using vertical::text;

-- create_workspace takes the enum in its signature, so it has to be replaced
-- before the type can go. Dropping by full signature avoids leaving an
-- overload behind.
drop function if exists public.create_workspace(
  uuid, text, public.business_vertical, text, text
);

drop type if exists public.business_vertical;

create or replace function public.create_workspace(
  p_user_id  uuid,
  p_name     text,
  p_vertical text default 'other',
  p_timezone text default 'UTC',
  p_currency text default 'USD',
  p_locale   text default 'en-US',
  p_country  text default null
)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base    text;
  v_slug    text;
  v_suffix  integer := 0;
  v_ws      public.workspaces;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'workspace name is required';
  end if;

  v_base := public.slugify(p_name);
  if v_base = '' then
    v_base := 'workspace';
  end if;

  v_slug := v_base;
  while exists (select 1 from public.workspaces w where w.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix::text;
  end loop;

  insert into public.workspaces (
    name, slug, vertical, timezone, currency, locale, country_code, created_by
  )
  values (
    trim(p_name), v_slug, p_vertical, p_timezone, p_currency, p_locale, p_country, p_user_id
  )
  returning * into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_ws.id, p_user_id, 'owner');

  -- Every workspace gets a simulator channel so flows are testable the moment
  -- the account exists, with no Meta setup at all.
  insert into public.channels (workspace_id, type, status, display_name, connected_at)
  values (v_ws.id, 'simulator', 'connected', 'Simulator', now());

  insert into public.events (workspace_id, type, entity_type, entity_id, actor_user_id)
  values (v_ws.id, 'workspace.created', 'workspace', v_ws.id, p_user_id);

  return v_ws;
end;
$$;

revoke execute on function public.create_workspace(uuid, text, text, text, text, text, text)
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: existing workspaces were all created for Pakistan.
-- ---------------------------------------------------------------------------

update public.workspaces
set locale = 'en-PK',
    country_code = 'PK'
where currency = 'PKR'
  and country_code is null;
