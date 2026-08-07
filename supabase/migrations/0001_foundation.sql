-- xSender · Schema v1 · Foundation
-- Extensions, shared helper functions, and enum types used across the schema.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'admin', 'agent', 'viewer');

create type public.business_vertical as enum (
  'restaurant',
  'clinic',
  'real_estate',
  'ecommerce',
  'other'
);

create type public.channel_type as enum (
  'whatsapp',
  'instagram',
  'messenger',
  'simulator'
);

create type public.channel_status as enum (
  'disconnected',
  'connecting',
  'connected',
  'error'
);

create type public.conversation_status as enum ('open', 'pending', 'resolved');

create type public.message_direction as enum ('inbound', 'outbound');

create type public.message_status as enum (
  'queued',
  'sent',
  'delivered',
  'read',
  'failed'
);

-- Who authored an outbound message (inbound is always the customer).
create type public.message_author as enum ('customer', 'flow', 'agent', 'campaign', 'system');

create type public.job_status as enum ('pending', 'running', 'completed', 'failed', 'dead');

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at honest without application code remembering to.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
