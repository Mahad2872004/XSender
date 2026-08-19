import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isAppPath } from '@/lib/routes';

/**
 * Auth gate. Runs before any route renders.
 *
 * Two jobs: refresh the Supabase session (Server Components cannot write
 * cookies, so the refreshed token has to be set here), and bounce signed-out
 * visitors away from the product.
 *
 * The gate is an allowlist inverted: everything is public except `/app/**`.
 * It used to be the other way round, which is why there was no marketing site —
 * an anonymous visitor could not reach any page at all.
 *
 * Named `proxy`, not `middleware` — the middleware convention is deprecated in
 * Next.js 16. This always runs on the Node runtime.
 */

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // getUser() revalidates against the auth server and triggers the refresh.
  // Do not replace with getSession(), which trusts the cookie as-is.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isAppPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Preserve where they were headed so login can return them there.
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const app = request.nextUrl.clone();
    app.pathname = '/app';
    app.search = '';
    return NextResponse.redirect(app);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets, and routes that carry
     * their own credential instead of a session: the Meta/payment webhooks
     * (signature-verified), the cron queue drain (shared secret), and the
     * public demo (its own httpOnly session cookie). Leaving those in would
     * redirect the caller to /login and silently stop webhooks and jobs — and
     * would make every demo message pay for an auth round trip it never uses.
     */
    '/((?!_next/static|_next/image|api/webhooks|api/jobs|api/demo|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
