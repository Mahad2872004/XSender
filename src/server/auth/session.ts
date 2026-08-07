import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { currentUser } from '@/server/db/session-client';
import {
  contextFromMembership,
  listWorkspacesForUser,
  type WorkspaceContext,
} from '@/server/db/tenancy';

/**
 * Session and workspace resolution.
 *
 * Everything here is wrapped in React's `cache()`, which dedupes calls within a
 * single request. That matters more than it looks: the layout, the page, and
 * any server action each ask "who is this and which workspace?", and a round
 * trip to Supabase costs ~265ms. Without deduping, one page load spent about
 * ten of them re-answering the same two questions.
 */

/** Cookie holding the workspace the user is currently looking at. */
export const ACTIVE_WORKSPACE_COOKIE = 'xs_workspace';

/** Verified against the auth server, once per request. */
export const getUser = cache(async (): Promise<User | null> => currentUser());

export const requireUser = cache(async (): Promise<User> => {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
});

/** Every workspace the signed-in user belongs to. One query per request. */
export const userWorkspaces = cache(async () => {
  const user = await requireUser();
  return listWorkspacesForUser(user.id);
});

/**
 * Resolve the workspace this request is acting on.
 *
 * Order of preference: the active-workspace cookie, then the user's first
 * membership. A cookie naming a workspace the user has been removed from falls
 * back rather than erroring, so a revoked invite doesn't lock someone out.
 *
 * Built from the membership rows already fetched, so it costs no extra query.
 *
 * Note: this does not redirect to first-run setup — /welcome itself calls this,
 * and doing so here would loop. Pages route into setup via requireOnboarded().
 */
export const requireWorkspace = cache(async (): Promise<WorkspaceContext> => {
  const user = await requireUser();
  const memberships = await userWorkspaces();

  if (memberships.length === 0) redirect('/onboarding');

  const cookieStore = await cookies();
  const preferred = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  const chosen = memberships.find((m) => m.workspace.id === preferred) ?? memberships[0];

  return contextFromMembership(chosen.workspace, user.id, chosen.role);
});

/**
 * Like requireWorkspace(), but sends a workspace that has never completed
 * first-run setup to /welcome. Use this on pages that assume flows and a
 * vertical exist; use requireWorkspace() on the setup screen itself.
 */
export async function requireOnboarded(): Promise<WorkspaceContext> {
  const ctx = await requireWorkspace();
  if (!ctx.workspace.onboarded_at) redirect('/welcome');
  return ctx;
}
