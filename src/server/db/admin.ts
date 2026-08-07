import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { publicEnv, serverEnv } from '@/lib/env';

export type AdminClient = SupabaseClient<Database>;

let cached: AdminClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 *
 * Do not reach for this directly in feature code — go through
 * `workspaceContext()` in ./tenancy, which scopes every query to one workspace.
 * The only legitimate direct callers are auth bootstrap, the webhook router
 * (which must resolve a channel before a workspace is known), and the worker.
 *
 * Deliberately not marked 'server-only': worker/ imports it outside Next.js.
 * `serverEnv()` throws if this ever loads in a browser.
 */
export function supabaseAdmin(): AdminClient {
  if (cached) return cached;

  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  cached = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
