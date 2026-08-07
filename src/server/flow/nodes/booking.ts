import { BookingSlotsConfigSchema, CreateBookingConfigSchema } from '@/lib/schemas/flow';
import { matchNumberedChoice } from '@/server/channels/types';
import {
  availableSlots,
  createBooking,
  SlotUnavailableError,
  summariseSlots,
  type Slot,
} from '@/server/domain/bookings';
import type { NodeDefinition } from '../node-types';
import { renderTemplate } from '../template';

/**
 * Booking nodes.
 *
 * Offering a slot and taking it are two steps with a gap between them, and in
 * that gap another customer can book the same table. The engine handles that
 * honestly: the database refuses the overlap and the customer is asked to pick
 * again rather than being told they have a booking that does not exist.
 */

const SELECTED_SLOT = '__selected_slot';

/** Ask for a day, then a time, offering only slots that are genuinely free. */
export const bookingSlotsNode: NodeDefinition<typeof BookingSlotsConfigSchema> = {
  type: 'booking_slots',
  configSchema: BookingSlotsConfigSchema,
  category: 'domain',
  label: 'Offer available times',
  description: 'Show the days and times you actually have free, and take a pick.',

  async enter(config, runtime) {
    const days = nextDays(config.daysAhead);

    runtime.send({
      type: 'list',
      text: renderTemplate(config.datePrompt, runtime.variables),
      buttonLabel: 'See days',
      sections: [
        {
          title: 'Available days',
          rows: days.map((day) => ({
            id: day.toISOString().slice(0, 10),
            title: formatDay(day),
          })),
        },
      ],
    });

    return {
      kind: 'await',
      awaiting: {
        nodeId: '',
        kind: 'booking_date',
        options: days.map((day) => ({
          id: day.toISOString().slice(0, 10),
          title: formatDay(day),
        })),
        attempts: 0,
      },
    };
  },

  async resume(config, runtime, input, awaiting) {
    const raw =
      input.payload.type === 'reply'
        ? input.payload.replyId
        : input.payload.type === 'text'
          ? input.payload.text.trim()
          : '';

    if (awaiting.kind === 'booking_date') {
      const dateId =
        awaiting.options?.find((o) => o.id === raw)?.id ??
        matchNumberedChoice(raw, awaiting.options ?? []);

      if (!dateId) {
        return retry(runtime, awaiting, 'Please pick one of the days above.');
      }

      const partySize = config.partySizeVariable
        ? Number(runtime.variables[config.partySizeVariable]) || 1
        : 1;

      const slots = summariseSlots(
        await availableSlots(runtime.ctx, {
          date: new Date(`${dateId}T00:00:00`),
          durationMinutes: config.durationMinutes,
          partySize,
        })
      );

      if (slots.length === 0) {
        runtime.send({ type: 'text', text: config.noSlotsMessage });
        return { kind: 'advance', handle: 'no_slots' };
      }

      runtime.setVariable('booking_date', dateId);

      const rows = slots.map((slot) => ({
        id: slotId(slot),
        title: formatTime(slot.startsAt),
        description: slot.resourceName.slice(0, 72),
      }));

      runtime.send({
        type: 'list',
        text: renderTemplate(config.slotPrompt, runtime.variables),
        buttonLabel: 'See times',
        sections: [{ title: formatDay(new Date(`${dateId}T00:00:00`)), rows }],
      });

      return {
        kind: 'await',
        awaiting: {
          nodeId: '',
          kind: 'booking_slot',
          options: rows.map((r) => ({ id: r.id, title: r.title })),
          attempts: 0,
        },
      };
    }

    // Waiting on a time.
    const chosenId =
      awaiting.options?.find((o) => o.id === raw)?.id ??
      matchNumberedChoice(raw, awaiting.options ?? []);

    if (!chosenId) {
      return retry(runtime, awaiting, 'Please pick one of the times above.');
    }

    const parsed = parseSlotId(chosenId);
    if (!parsed) return retry(runtime, awaiting, 'Please pick one of the times above.');

    // Handed to create_booking, which is what actually claims it.
    runtime.setVariable(SELECTED_SLOT, parsed);
    runtime.setVariable('booking_time', formatDateTime(new Date(parsed.startsAt)));

    runtime.note({ slot: parsed.startsAt, resourceId: parsed.resourceId });
    return { kind: 'advance', handle: 'next' };
  },
};

export const createBookingNode: NodeDefinition<typeof CreateBookingConfigSchema> = {
  type: 'create_booking',
  configSchema: CreateBookingConfigSchema,
  category: 'domain',
  label: 'Confirm the booking',
  description: 'Claim the chosen slot and confirm it to the customer.',

  async enter(config, runtime) {
    const selected = runtime.variables[SELECTED_SLOT] as
      | { startsAt: string; endsAt: string; resourceId: string }
      | undefined;

    if (!selected) {
      runtime.note({ error: 'no slot selected' });
      return { kind: 'advance', handle: 'error' };
    }

    const partySize = config.partySizeVariable
      ? Number(runtime.variables[config.partySizeVariable]) || null
      : null;
    const notes = config.notesVariable
      ? (runtime.variables[config.notesVariable] as string | undefined) ?? null
      : null;

    try {
      const booking = await createBooking(runtime.ctx, {
        contactId: runtime.contact.id,
        conversationId: runtime.conversation.id,
        resourceId: selected.resourceId,
        startsAt: new Date(selected.startsAt),
        endsAt: new Date(selected.endsAt),
        partySize,
        notes,
        placedBy: 'flow',
      });

      runtime.setVariable(config.saveAs, booking.code);
      runtime.setVariable('booking_id', booking.id);
      runtime.setVariable(SELECTED_SLOT, null);

      runtime.send({
        type: 'text',
        text: renderTemplate(config.confirmationMessage, runtime.variables),
      });

      runtime.note({ bookingCode: booking.code });
      return { kind: 'advance', handle: 'success' };
    } catch (cause) {
      // Someone else took the slot between offering and confirming. Say so and
      // send them back to pick again, rather than failing the run.
      if (cause instanceof SlotUnavailableError) {
        runtime.send({ type: 'text', text: cause.message });
        runtime.note({ error: 'slot taken in the meantime' });
        return { kind: 'advance', handle: 'taken' };
      }

      runtime.note({ error: cause instanceof Error ? cause.message : String(cause) });
      return { kind: 'advance', handle: 'error' };
    }
  },
};

// ---------------------------------------------------------------------------

function retry(
  runtime: Parameters<NonNullable<typeof bookingSlotsNode.resume>>[1],
  awaiting: { nodeId: string; kind: string; options?: Array<{ id: string; title: string }>; attempts: number },
  message: string
) {
  const attempts = awaiting.attempts + 1;
  if (attempts >= 3) return { kind: 'advance' as const, handle: 'fallback' };
  runtime.send({ type: 'text', text: message });
  return { kind: 'await' as const, awaiting: { ...awaiting, attempts } };
}

function nextDays(count: number): Date[] {
  const days: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  // WhatsApp lists cap at 10 rows.
  for (let i = 0; i < Math.min(count, 10); i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    days.push(day);
  }
  return days;
}

/** Slot identity travels through the customer's reply, so it must round-trip. */
function slotId(slot: Slot): string {
  return `${slot.startsAt.toISOString()}|${slot.endsAt.toISOString()}|${slot.resourceId}`;
}

function parseSlotId(
  id: string
): { startsAt: string; endsAt: string; resourceId: string } | null {
  const [startsAt, endsAt, resourceId] = id.split('|');
  if (!startsAt || !endsAt || !resourceId) return null;
  return { startsAt, endsAt, resourceId };
}

function formatDay(day: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(date: Date): string {
  return `${formatDay(date)} at ${formatTime(date)}`;
}
