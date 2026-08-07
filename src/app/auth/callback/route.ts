import { NextResponse, type NextRequest } from 'next/server';
import { supabaseSession } from '@/server/db/session-client';
import { listWorkspacesForUser } from '@/server/db/tenancy';
import { ACTIVE_WORKSPACE_COOKIE } from '@/server/auth/session';

/**
 * Exchange point for email confirmation links and OAuth redirects.
 *
 * Supabase sends the user here with a `code`; trading it for a session sets the
 * auth cookies, after which they either land in their workspace or go create
 * one.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=invalid_code`);
  }

  const memberships = await listWorkspacesForUser(data.user.id);

  if (memberships.length === 0) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  const destination = next?.startsWith('/') ? next : '/';
  const response = NextResponse.redirect(`${origin}${destination}`);

  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, memberships[0].workspace.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
