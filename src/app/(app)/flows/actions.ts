'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWorkspace } from '@/server/auth/session';
import { FlowGraphSchema } from '@/lib/schemas/flow';
import { installFlowTemplate, publishVersion, FlowValidationError } from '@/server/flow/publish';
import { restoreVersion, saveDraftGraph, unpublishFlow } from '@/server/flow/drafts';
import { templateById } from '@/server/flow/templates';
import { validateGraph, type ValidationIssue } from '@/server/flow/validate';

export type FlowActionResult = {
  ok: boolean;
  message?: string;
  issues?: ValidationIssue[];
};

/** Install a gallery template and open it in the builder. */
export async function installTemplate(templateId: string): Promise<void> {
  const ctx = await requireWorkspace();
  const template = templateById(templateId);
  if (!template) throw new Error(`Unknown template "${templateId}".`);

  const { flow } = await installFlowTemplate(ctx, {
    name: template.name,
    description: template.description,
    vertical: ctx.workspace.vertical,
    trigger: template.trigger,
    graph: template.build(ctx.workspace.name),
    entryNodeId: template.entryNodeId,
    // Installed as a draft: a business owner should see and tune a flow before
    // it starts answering real customers.
    publish: false,
  });

  revalidatePath('/flows');
  redirect(`/flows/${flow.id}`);
}

const saveInput = z.object({
  flowId: z.string().uuid(),
  versionId: z.string().uuid(),
  entryNodeId: z.string().min(1),
  graph: FlowGraphSchema,
});

/**
 * Autosave from the canvas.
 *
 * Returns the version actually written — editing a published flow forks a new
 * draft, so the builder must know which version it is now editing.
 */
export async function saveFlowGraph(
  raw: unknown
): Promise<FlowActionResult & { versionId?: string }> {
  const parsed = saveInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid flow data.' };
  }

  const ctx = await requireWorkspace();

  try {
    const version = await saveDraftGraph(
      ctx,
      parsed.data.flowId,
      parsed.data.versionId,
      parsed.data.graph,
      parsed.data.entryNodeId
    );
    return { ok: true, versionId: version.id };
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : 'Could not save.' };
  }
}

/** Check a graph without saving, so the builder can warn as you edit. */
export async function checkFlowGraph(raw: unknown, entryNodeId: string): Promise<FlowActionResult> {
  const result = validateGraph(raw, entryNodeId);
  return {
    ok: result.valid,
    issues: result.issues,
    message: result.valid ? 'Ready to publish.' : undefined,
  };
}

export async function publishFlow(flowId: string, versionId: string): Promise<FlowActionResult> {
  const ctx = await requireWorkspace();

  try {
    await publishVersion(ctx, flowId, versionId);
  } catch (cause) {
    if (cause instanceof FlowValidationError) {
      return { ok: false, message: cause.message, issues: cause.issues };
    }
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : 'Could not publish this flow.',
    };
  }

  revalidatePath('/flows');
  revalidatePath(`/flows/${flowId}`);
  return { ok: true, message: 'Published. This flow is now answering customers.' };
}

export async function takeFlowOffline(flowId: string): Promise<FlowActionResult> {
  const ctx = await requireWorkspace();

  try {
    await unpublishFlow(ctx, flowId);
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : 'Could not take this flow offline.',
    };
  }

  revalidatePath('/flows');
  revalidatePath(`/flows/${flowId}`);
  return { ok: true, message: 'Taken offline. Conversations already running will finish.' };
}

export async function restoreFlowVersion(
  flowId: string,
  versionId: string
): Promise<FlowActionResult> {
  const ctx = await requireWorkspace();

  try {
    await restoreVersion(ctx, flowId, versionId);
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : 'Could not restore that version.',
    };
  }

  revalidatePath(`/flows/${flowId}`);
  return { ok: true, message: 'Restored as a new draft.' };
}
