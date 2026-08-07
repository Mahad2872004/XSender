/**
 * Seed a workspace's catalog and bookable resources.
 *
 *   npx tsx --env-file=.env scripts/seed-workspace.ts            # first workspace
 *   npx tsx --env-file=.env scripts/seed-workspace.ts "Donner"   # by name
 *
 * First-run setup does this automatically, so this is for workspaces created
 * before that existed — or for putting a demo back after clearing it out.
 * Safe to re-run: it does nothing if the catalog already has items.
 */

import { supabaseAdmin } from '@/server/db/admin';
import { systemContext } from '@/server/db/tenancy';
import { seedVerticalData } from '@/server/domain/seed';
import type { Workspace } from '@/lib/database.types';

async function main() {
  const wanted = process.argv[2];

  const { data: workspaces, error } = await supabaseAdmin()
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const list = (workspaces ?? []) as Workspace[];
  const workspace = wanted
    ? list.find((w) => w.name.toLowerCase() === wanted.toLowerCase())
    : list[0];

  if (!workspace) {
    console.error(
      wanted
        ? `No workspace named "${wanted}". Found: ${list.map((w) => w.name).join(', ') || 'none'}`
        : 'No workspaces yet — sign up in the app first.'
    );
    process.exit(1);
  }

  const ctx = await systemContext(workspace.id);
  const result = await seedVerticalData(ctx, workspace.vertical);

  if (result.items === 0 && result.resources === 0) {
    console.log(`"${workspace.name}" already has a catalog — nothing to do.`);
  } else {
    console.log(
      `Seeded "${workspace.name}" (${workspace.vertical}): ` +
        `${result.items} items, ${result.resources} bookable resources.`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
