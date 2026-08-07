-- xSender · Fold contact bookkeeping into the message trigger.
--
-- Every Supabase round trip costs ~265ms from the app to the database region,
-- and inbound handling is the path a customer sits waiting on. Updating
-- contacts.last_seen_at from application code was one such trip; the trigger is
-- already touching the conversation for the same message, so it can do this in
-- the same statement for free.

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
declare
  v_contact_id uuid;
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
  where c.id = new.conversation_id
  returning c.contact_id into v_contact_id;

  -- Only inbound messages say anything about when the customer was last active.
  if new.direction = 'inbound' and v_contact_id is not null then
    update public.contacts
    set last_seen_at = new.created_at
    where id = v_contact_id;
  end if;

  return new;
end;
$$;
