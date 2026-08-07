-- Undo migration 0001 from the shared Promptly project.
--
-- Migration 0001 applied to project `stuamoozecavlfrtgkiz` before we found the
-- marketing site already living there. xSender now has its own project, so
-- these artefacts are orphaned. Nothing references them — 0002 onward never
-- applied — so dropping them is safe.
--
-- Run this in the SQL editor of the OLD (marketing) project only.
-- Optional: they are inert, and leaving them breaks nothing.

drop function if exists public.set_updated_at();

drop type if exists public.job_status;
drop type if exists public.message_author;
drop type if exists public.message_status;
drop type if exists public.message_direction;
drop type if exists public.conversation_status;
drop type if exists public.channel_status;
drop type if exists public.channel_type;
drop type if exists public.business_vertical;
drop type if exists public.workspace_role;

-- Forget the migration so the CLI does not think 0001 is applied there.
delete from supabase_migrations.schema_migrations where version = '0001';

-- Deliberately NOT dropped: the pgcrypto and btree_gist extensions. They were
-- created with `if not exists`, so they may predate this and may be in use by
-- the marketing site. Removing them could break it.
