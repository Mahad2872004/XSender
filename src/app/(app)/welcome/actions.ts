'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWorkspace } from '@/server/auth/session';
import { installFlowTemplate } from '@/server/flow/publish';
import { starterTemplatesFor } from '@/server/flow/templates';
import { seedVerticalData } from '@/server/domain/seed';
import type { WelcomeState } from './form-state';

const input = z.object({
  vertical: z.enum(['restaurant', 'clinic', 'real_estate', 'ecommerce', 'other']),
});

/**
 * First-run setup.
 *
 * Picks the vertical, then installs its starter flows as drafts. Drafts, not
 * published: nothing should start answering a real customer because someone
 * clicked through a wizard.
 */
export async function completeSetup(
  _prev: WelcomeState,
  formData: FormData
): Promise<WelcomeState> {
  const parsed = input.safeParse({ vertical: formData.get('vertical') });
  if (!parsed.success) return { error: 'Pick the option closest to your business.' };

  const ctx = await requireWorkspace();
  ctx.requireRole('admin');

  const { vertical } = parsed.data;

  const { error: updateError } = await ctx.db
    .from('workspaces')
    .update({ vertical, onboarded_at: new Date().toISOString() })
    .eq('id', ctx.workspaceId);

  if (updateError) return { error: updateError.message };

  try {
    // Menu and resources before flows: catalog_browse reads the catalog, so a
    // flow installed against an empty one would demo as "our menu is updating".
    await seedVerticalData(ctx, vertical);

    for (const template of starterTemplatesFor(vertical)) {
      await installFlowTemplate(ctx, {
        name: template.name,
        description: template.description,
        vertical,
        trigger: template.trigger,
        graph: template.build(ctx.workspace.name),
        entryNodeId: template.entryNodeId,
        publish: false,
      });
    }
  } catch (cause) {
    // The workspace is set up even if seeding failed; the gallery is still
    // there, so send them on rather than trapping them in the wizard.
    return {
      error:
        cause instanceof Error
          ? `Set up, but the starter flows could not be added: ${cause.message}`
          : 'Set up, but the starter flows could not be added.',
    };
  }

  revalidatePath('/flows');
  redirect('/flows');
}

/** Skip seeding but still mark the workspace as onboarded. */
export async function skipSetup(): Promise<void> {
  const ctx = await requireWorkspace();
  await ctx.db
    .from('workspaces')
    .update({ onboarded_at: new Date().toISOString() })
    .eq('id', ctx.workspaceId);

  redirect('/');
}
