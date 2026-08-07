'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { supabaseSession, currentUser } from '@/server/db/session-client';
import { supabaseAdmin } from '@/server/db/admin';
import { listWorkspacesForUser } from '@/server/db/tenancy';
import { ACTIVE_WORKSPACE_COOKIE } from '@/server/auth/session';
import type { BusinessVertical } from '@/lib/database.types';
import type { AuthFormState } from './form-state';

const credentials = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const signupInput = credentials.extend({
  fullName: z.string().trim().min(1, 'Tell us your name.'),
  businessName: z.string().trim().min(1, 'Tell us your business name.'),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Please check the form and try again.';
}

/** Point the session at a workspace, so requireWorkspace() picks it up. */
async function setActiveWorkspace(workspaceId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await supabaseSession();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: error.message };

  const memberships = await listWorkspacesForUser(data.user.id);
  if (memberships.length === 0) redirect('/onboarding');

  await setActiveWorkspace(memberships[0].workspace.id);

  const next = formData.get('next');
  redirect(typeof next === 'string' && next.startsWith('/') ? next : '/');
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    businessName: formData.get('businessName'),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { email, password, fullName, businessName } = parsed.data;
  const supabase = await supabaseSession();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: 'Could not create the account. Try again.' };

  // With email confirmation enabled there is no session yet, so the workspace
  // is created after they confirm and land on /onboarding instead.
  if (!data.session) {
    return {
      error: `Check ${email} for a confirmation link to finish setting up ${businessName}.`,
    };
  }

  const created = await createWorkspaceFor(data.user.id, businessName);
  if (!created.ok) return { error: created.error };

  redirect('/');
}

type WorkspaceResult = { ok: true; workspaceId: string } | { ok: false; error: string };

/**
 * Create a workspace via the bootstrap function, which also writes the owner
 * membership and the simulator channel in one transaction.
 */
async function createWorkspaceFor(
  userId: string,
  name: string,
  vertical: BusinessVertical = 'other'
): Promise<WorkspaceResult> {
  const { data, error } = await supabaseAdmin().rpc('create_workspace', {
    p_user_id: userId,
    p_name: name,
    p_vertical: vertical,
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not create your workspace.' };
  }

  await setActiveWorkspace(data.id);
  return { ok: true, workspaceId: data.id };
}

/** Used by /onboarding when a signed-in user has no workspace yet. */
export async function createFirstWorkspace(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const user = await currentUser();
  if (!user) redirect('/login');

  const parsed = z
    .object({
      businessName: z.string().trim().min(1, 'Tell us your business name.'),
      vertical: z.enum(['restaurant', 'clinic', 'real_estate', 'ecommerce', 'other']),
    })
    .safeParse({
      businessName: formData.get('businessName'),
      vertical: formData.get('vertical') ?? 'other',
    });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const created = await createWorkspaceFor(
    user.id,
    parsed.data.businessName,
    parsed.data.vertical
  );
  if (!created.ok) return { error: created.error };

  redirect('/');
}

export async function signOut() {
  const supabase = await supabaseSession();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_WORKSPACE_COOKIE);

  redirect('/login');
}

/** Workspace switcher. Verifies membership before trusting the id. */
export async function switchWorkspace(workspaceId: string) {
  const user = await currentUser();
  if (!user) redirect('/login');

  const memberships = await listWorkspacesForUser(user.id);
  if (!memberships.some((m) => m.workspace.id === workspaceId)) {
    throw new Error('You do not have access to that workspace.');
  }

  await setActiveWorkspace(workspaceId);
  redirect('/');
}
