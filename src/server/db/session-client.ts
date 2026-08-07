import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client bound to the signed-in user's session cookies.
 *
 * Used to answer "who is this request?" — never for tenant data access, which
 * goes through the admin client behind the tenancy guard. Note that `cookies()`
 * is async in Next.js 16.
 */
export async function supabaseSession() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Token refresh is handled in
            // proxy.ts, which runs before rendering, so ignoring this is safe.
          }
        },
      },
    }
  );
}

/** The authenticated user, or null. Verified against the auth server. */
export async function currentUser() {
  const supabase = await supabaseSession();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
