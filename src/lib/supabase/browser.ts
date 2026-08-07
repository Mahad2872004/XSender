'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser-side Supabase client, anon key only.
 *
 * Everything it can reach is constrained by RLS. Use it for auth actions and
 * Realtime subscriptions; all reads and writes that carry business logic go
 * through the app API instead.
 */
export function supabaseBrowser() {
  if (cached) return cached;

  const env = publicEnv();
  cached = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return cached;
}
