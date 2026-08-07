-- xSender · Schema v1 · Workspace bootstrap
-- Creating a workspace means creating three rows that must all exist or none:
-- the workspace, an owner membership, and the built-in simulator channel.
-- supabase-js has no transaction API, so this lives in the database.

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

create or replace function public.create_workspace(
  p_user_id  uuid,
  p_name     text,
  p_vertical public.business_vertical default 'other',
  p_timezone text default 'Asia/Karachi',
  p_currency text default 'PKR'
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

  insert into public.workspaces (name, slug, vertical, timezone, currency, created_by)
  values (trim(p_name), v_slug, p_vertical, p_timezone, p_currency, p_user_id)
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

-- Only the service role calls this; the browser must never mint workspaces.
revoke execute on function public.create_workspace(uuid, text, public.business_vertical, text, text)
  from anon, authenticated;
