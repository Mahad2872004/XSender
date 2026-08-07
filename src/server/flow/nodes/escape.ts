import { HandoffConfigSchema, UpdateContactConfigSchema } from '@/lib/schemas/flow';
import type { Json } from '@/lib/database.types';
import type { NodeDefinition } from '../node-types';
import { renderTemplate } from '../template';

/**
 * The escape hatch that makes the whole product safe to deploy.
 *
 * Whatever the bot cannot handle ends here: the conversation is flagged, the
 * run stops, and a person picks it up. The customer is told a human is coming,
 * so nobody is ever left talking to a wall.
 */
export const handoffNode: NodeDefinition<typeof HandoffConfigSchema> = {
  type: 'handoff_to_human',
  configSchema: HandoffConfigSchema,
  category: 'escape',
  label: 'Hand to a human',
  description: 'Flag the conversation for staff and stop automating it.',

  async enter(config, runtime) {
    if (config.message.trim().length > 0) {
      runtime.send({
        type: 'text',
        text: renderTemplate(config.message, runtime.variables),
      });
    }

    await runtime.ctx
      .table('conversations')
      .update({ needs_human: true, status: 'pending' })
      .eq('id', runtime.conversation.id);

    if (config.tags.length > 0) {
      const existing = runtime.contact.tags ?? [];
      const merged = [...new Set([...existing, ...config.tags])];
      await runtime.ctx
        .table('contacts')
        .update({ tags: merged })
        .eq('id', runtime.contact.id);
    }

    // Feeds the ROI panel: handoffs are the counterweight to "auto-handled".
    await runtime.ctx.table('events').insert({
      type: 'automation.handoff',
      entity_type: 'conversation',
      entity_id: runtime.conversation.id,
      payload: { note: config.note ?? null, tags: config.tags } as Json,
    });

    runtime.note({ tags: config.tags, note: config.note });

    return { kind: 'end', reason: 'handed off to a human' };
  },
};

export const updateContactNode: NodeDefinition<typeof UpdateContactConfigSchema> = {
  type: 'update_contact',
  configSchema: UpdateContactConfigSchema,
  category: 'domain',
  label: 'Update contact',
  description: 'Save what the customer told you onto their contact record.',

  async enter(config, runtime) {
    const patch: Record<string, unknown> = {};
    const attributes: Record<string, unknown> = {
      ...((runtime.contact.attributes as Record<string, unknown>) ?? {}),
    };

    for (const { field, value } of config.fields) {
      const rendered = renderTemplate(value, runtime.variables);
      // Known columns go on the record itself; anything else is a
      // vertical-specific attribute and lives in the jsonb bag.
      if (field === 'full_name' || field === 'phone' || field === 'email') {
        patch[field] = rendered;
      } else {
        attributes[field] = rendered;
      }
    }

    if (config.addTags.length > 0) {
      patch.tags = [...new Set([...(runtime.contact.tags ?? []), ...config.addTags])];
    }

    if (Object.keys(attributes).length > 0) {
      patch.attributes = attributes as Json;
    }

    if (Object.keys(patch).length > 0) {
      await runtime.ctx
        .table('contacts')
        .update(patch)
        .eq('id', runtime.contact.id);
    }

    runtime.note({ updated: Object.keys(patch) });

    return { kind: 'advance' };
  },
};
