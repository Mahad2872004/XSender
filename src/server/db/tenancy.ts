import type { Database, Workspace, WorkspaceRole } from '@/lib/database.types';
import { supabaseAdmin, type AdminClient } from './admin';

/**
 * Tenancy guard.
 *
 * The service-role client bypasses RLS, so isolation between client businesses
 * is enforced here in application code. Feature code must obtain a
 * `WorkspaceContext` and use `ctx.table(...)`, which pins every query to one
 * workspace_id. Reaching for `supabaseAdmin()` directly in a feature module is
 * the one thing that can silently leak one client's data to another.
 */

/** Tables that carry a workspace_id and must always be scoped. */
export const TENANT_TABLES = [
  'channels',
  'contacts',
  'contact_identities',
  'conversations',
  'messages',
  'events',
  'flows',
  'flow_versions',
  'flow_runs',
  'flow_run_steps',
  'catalog_categories',
  'catalog_items',
  'orders',
  'order_items',
  'resources',
  'availability_rules',
  'availability_exceptions',
  'bookings',
] as const;

export type TenantTable = (typeof TENANT_TABLES)[number];

type Tables = Database['public']['Tables'];
type InsertOf<T extends TenantTable> = Omit<Tables[T]['Insert'], 'workspace_id'>;
type UpdateOf<T extends TenantTable> = Omit<Tables[T]['Update'], 'workspace_id'>;

export class WorkspaceAccessError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = 'WorkspaceAccessError';
  }
}

export interface QueryError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * The slice of supabase's filter builder this codebase actually uses.
 *
 * Hand-declared on purpose — see the note on ScopedTable.select. Column names
 * are plain strings here, so the compiler checks the row shape but not the
 * column name; the alternative costs more than it buys.
 */
export interface ScopedQuery<Row>
  extends PromiseLike<{ data: Row[] | null; error: QueryError | null }> {
  eq(column: string, value: unknown): ScopedQuery<Row>;
  neq(column: string, value: unknown): ScopedQuery<Row>;
  is(column: string, value: unknown): ScopedQuery<Row>;
  in(column: string, values: readonly unknown[]): ScopedQuery<Row>;
  not(column: string, operator: string, value: unknown): ScopedQuery<Row>;
  gt(column: string, value: unknown): ScopedQuery<Row>;
  lt(column: string, value: unknown): ScopedQuery<Row>;
  gte(column: string, value: unknown): ScopedQuery<Row>;
  lte(column: string, value: unknown): ScopedQuery<Row>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ScopedQuery<Row>;
  limit(count: number): ScopedQuery<Row>;
  range(from: number, to: number): ScopedQuery<Row>;
  /** Errors when the result is not exactly one row. */
  single(): PromiseLike<{ data: Row | null; error: QueryError | null }>;
  /** Null when there is no match, error only on a real failure. */
  maybeSingle(): PromiseLike<{ data: Row | null; error: QueryError | null }>;
}

/** Ascending privilege. A role satisfies a requirement at or below its rank. */
const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  agent: 1,
  admin: 2,
  owner: 3,
};

export interface WorkspaceContext {
  workspaceId: string;
  workspace: Workspace;
  userId: string;
  role: WorkspaceRole;

  /** Scoped query builder. Prefer this over `db`. */
  table<T extends TenantTable>(name: T): ScopedTable<T>;


  /**
   * Unscoped service-role client, for the rare query the scoped builder can't
   * express (aggregates, joins across tenant tables, RPC). You are responsible
   * for filtering by `workspaceId` yourself.
   */
  db: AdminClient;

  hasRole(minimum: WorkspaceRole): boolean;
  requireRole(minimum: WorkspaceRole): void;
}

/**
 * The scoped builder's shape is inferred from `scopedTable` rather than
 * hand-declared, so each method keeps the real PostgrestFilterBuilder type and
 * callers can go on chaining `.eq()`, `.order()`, `.single()` as usual.
 */
export type ScopedTable<T extends TenantTable> = ReturnType<typeof scopedTable<T>>;

/**
 * Apply the tenant filter to a query builder.
 *
 * Every table in TENANT_TABLES has a workspace_id column, but TypeScript cannot
 * prove that for an unresolved generic `T`, so `.eq('workspace_id', …)` is
 * rejected inside the generic function. Narrowing to the one method we need
 * keeps the builder's real type on the way out — callers still get full
 * inference on `.order()`, `.single()`, and the resulting Row type.
 */
function scopeToWorkspace<Q>(query: Q, workspaceId: string): Q {
  return (query as unknown as { eq(column: string, value: string): Q }).eq(
    'workspace_id',
    workspaceId
  );
}

function scopedTable<T extends TenantTable>(db: AdminClient, name: T, workspaceId: string) {
  return {
    /**
     * Scoped read.
     *
     * Returns the narrow ScopedQuery interface rather than supabase's own
     * builder: resolving that builder's select-query parser generically across
     * every tenant table overwhelms the compiler. Row typing — the part worth
     * having — is preserved; pass a shape when selecting a subset of columns.
     */
    select<R = Tables[T]['Row']>(columns = '*'): ScopedQuery<R> {
      return scopeToWorkspace(
        db.from(name).select(columns),
        workspaceId
      ) as unknown as ScopedQuery<R>;
    },
    insert(values: InsertOf<T> | InsertOf<T>[]) {
      const rows = (Array.isArray(values) ? values : [values]).map((row) => ({
        ...row,
        workspace_id: workspaceId,
      }));
      // The caller's insert type has been widened by exactly the column the
      // table expects, which the generic signature cannot express.
      return db.from(name).insert(rows as never);
    },
    update(values: UpdateOf<T>) {
      return scopeToWorkspace(db.from(name).update(values as never), workspaceId);
    },
    delete() {
      return scopeToWorkspace(db.from(name).delete(), workspaceId);
    },
  };
}

/**
 * Build a context from membership data the caller already has.
 *
 * Every round trip to Supabase costs ~265ms from here, so callers that have
 * just listed a user's workspaces must not pay for a second lookup to turn one
 * of them into a context.
 */
export function contextFromMembership(
  workspace: Workspace,
  userId: string,
  role: WorkspaceRole
): WorkspaceContext {
  return buildContext(workspace, userId, role);
}

function buildContext(
  workspace: Workspace,
  userId: string,
  role: WorkspaceRole
): WorkspaceContext {
  const db = supabaseAdmin();

  return {
    workspaceId: workspace.id,
    workspace,
    userId,
    role,
    db,
    table: (name) => scopedTable(db, name, workspace.id),
    hasRole: (minimum) => ROLE_RANK[role] >= ROLE_RANK[minimum],
    requireRole(minimum) {
      if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
        throw new WorkspaceAccessError(
          `This action requires the ${minimum} role or higher.`,
          403
        );
      }
    },
  };
}

/**
 * Build a context for a user acting on a workspace, verifying membership.
 * Throws rather than returning null: forgetting to check a null is a silent
 * isolation bug, whereas an unhandled throw is loud.
 */
export async function workspaceContext(
  userId: string,
  workspaceId: string
): Promise<WorkspaceContext> {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from('workspace_members')
    .select('role, workspace:workspaces(*)')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    throw new WorkspaceAccessError(`Could not resolve workspace: ${error.message}`, 403);
  }
  if (!data?.workspace) {
    throw new WorkspaceAccessError('You do not have access to this workspace.', 403);
  }

  const workspace = data.workspace as unknown as Workspace;
  return buildContext(workspace, userId, data.role as WorkspaceRole);
}

/**
 * Server-side entry point used by jobs and webhooks, where there is no user.
 * Acts with owner privileges — only ever call it from trusted server code that
 * has already established which workspace an event belongs to.
 */
export async function systemContext(workspaceId: string): Promise<WorkspaceContext> {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkspaceAccessError(`Unknown workspace ${workspaceId}.`, 404);
  }

  return buildContext(data as Workspace, 'system', 'owner');
}

/** Every workspace this user belongs to, for the switcher and post-login routing. */
export async function listWorkspacesForUser(
  userId: string
): Promise<Array<{ workspace: Workspace; role: WorkspaceRole }>> {
  const db = supabaseAdmin();

  const { data, error } = await db
    .from('workspace_members')
    .select('role, workspace:workspaces(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new WorkspaceAccessError(error.message, 403);

  return (data ?? [])
    .filter((row) => row.workspace)
    .map((row) => ({
      workspace: row.workspace as unknown as Workspace,
      role: row.role as WorkspaceRole,
    }));
}
