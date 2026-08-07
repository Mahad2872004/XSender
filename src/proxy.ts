import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Auth gate. Runs before any route renders.
 *
 * Two jobs: refresh the Supabase session (Server Components cannot write
 * cookies, so the refreshed token has to be set here), and bounce signed-out
 * visitors to /login before they reach a page that would query tenant data.
 *
 * Named `proxy`, not `middleware` — the middleware convention is deprecated in
 * Next.js 16. This always runs on the Node runtime.
 */

/** Paths reachable without a session. */
const PUBLIC_PATHS = ['/login', '/signup', '/auth/callback', '/auth/confirm'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

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

  if (!user && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Preserve where they were headed so login can return them there.
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the Meta/payment webhooks (which
     * authenticate by signature, not session), and static assets.
     */
    '/((?!_next/static|_next/image|api/webhooks|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
