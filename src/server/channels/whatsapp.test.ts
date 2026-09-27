import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppWebhook, phoneNumberIdFromWebhook } from './whatsapp';

/** A realistic Cloud API webhook envelope. */
function envelope(value: Record<string, unknown>) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '102290129340398',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550100', phone_number_id: '106540352242922' },
              ...value,
            },
          },
        ],
      },
    ],
  };
}

const CONTACTS = [{ profile: { name: 'Ayesha K.' }, wa_id: '923001234567' }];

describe('phoneNumberIdFromWebhook', () => {
  it('finds the phone number id used to route to a workspace', () => {
    expect(phoneNumberIdFromWebhook(envelope({}))).toBe('106540352242922');
  });

  it('returns null for an unrelated payload', () => {
    expect(phoneNumberIdFromWebhook({ object: 'page', entry: [] })).toBeNull();
    expect(phoneNumberIdFromWebhook({})).toBeNull();
    expect(phoneNumberIdFromWebhook(null)).toBeNull();
  });
});

describe('normalizeWhatsAppWebhook — messages', () => {
  it('normalizes a text message and attaches the profile name', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        contacts: CONTACTS,
        messages: [
          {
            from: '923001234567',
            id: 'wamid.ABC',
            timestamp: '1758800000',
            type: 'text',
            text: { body: 'Are you open?' },
          },
        ],
      })
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      externalId: 'wamid.ABC',
      externalUserId: '923001234567',
      channelType: 'whatsapp',
      senderName: 'Ayesha K.',
      payload: { type: 'text', text: 'Are you open?' },
    });
  });

  it('converts unix seconds to a real date', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          { from: '1', id: 'w1', timestamp: '1758800000', type: 'text', text: { body: 'hi' } },
        ],
      })
    );
    // Seconds, not milliseconds — treating it as ms lands in 1970.
    expect(messages[0].timestamp.toISOString()).toBe('2025-09-25T11:33:20.000Z');
  });

  it('turns a tapped button into a reply carrying its id', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          {
            from: '923001234567',
            id: 'wamid.BTN',
            type: 'interactive',
            interactive: {
              type: 'button_reply',
              button_reply: { id: 'order', title: 'View Menu' },
            },
          },
        ],
      })
    );

    // The engine branches on the id so wording can change without breaking a
    // published flow.
    expect(messages[0].payload).toEqual({
      type: 'reply',
      replyId: 'order',
      title: 'View Menu',
    });
  });

  it('turns a list selection into a reply', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          {
            from: '1',
            id: 'w1',
            type: 'interactive',
            interactive: { type: 'list_reply', list_reply: { id: 'mains', title: 'Mains' } },
          },
        ],
      })
    );
    expect(messages[0].payload).toEqual({ type: 'reply', replyId: 'mains', title: 'Mains' });
  });

  it('uses the payload of a template quick-reply button', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          {
            from: '1',
            id: 'w1',
            type: 'button',
            button: { text: 'Confirm', payload: 'confirm_order' },
          },
        ],
      })
    );
    expect(messages[0].payload).toEqual({
      type: 'reply',
      replyId: 'confirm_order',
      title: 'Confirm',
    });
  });

  it('normalizes a shared location', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          {
            from: '1',
            id: 'w1',
            type: 'location',
            location: { latitude: 31.5204, longitude: 74.3587, name: 'Home' },
          },
        ],
      })
    );
    expect(messages[0].payload).toMatchObject({
      type: 'location',
      latitude: 31.5204,
      longitude: 74.3587,
      name: 'Home',
    });
  });

  it('records an unsupported type rather than dropping it', () => {
    // A sticker must still reach the engine, so the flow can hand off instead
    // of appearing to ignore the customer.
    const { messages } = normalizeWhatsAppWebhook(
      envelope({ messages: [{ from: '1', id: 'w1', type: 'sticker' }] })
    );
    expect(messages[0].payload).toEqual({ type: 'unsupported', raw: 'sticker' });
  });

  it('handles several messages in one delivery', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({
        messages: [
          { from: '1', id: 'w1', type: 'text', text: { body: 'one' } },
          { from: '1', id: 'w2', type: 'text', text: { body: 'two' } },
        ],
      })
    );
    expect(messages.map((m) => m.externalId)).toEqual(['w1', 'w2']);
  });

  it('skips a message with no sender', () => {
    const { messages } = normalizeWhatsAppWebhook(
      envelope({ messages: [{ id: 'w1', type: 'text', text: { body: 'orphan' } }] })
    );
    expect(messages).toHaveLength(0);
  });
});

describe('normalizeWhatsAppWebhook — delivery receipts', () => {
  it('normalizes sent, delivered and read', () => {
    const { statuses } = normalizeWhatsAppWebhook(
      envelope({
        statuses: [
          { id: 'wamid.1', status: 'sent', timestamp: '1758800000' },
          { id: 'wamid.2', status: 'delivered', timestamp: '1758800001' },
          { id: 'wamid.3', status: 'read', timestamp: '1758800002' },
        ],
      })
    );
    expect(statuses.map((s) => s.status)).toEqual(['sent', 'delivered', 'read']);
  });

  it('carries the reason a message failed', () => {
    const { statuses } = normalizeWhatsAppWebhook(
      envelope({
        statuses: [
          {
            id: 'wamid.4',
            status: 'failed',
            timestamp: '1758800000',
            errors: [{ code: 131047, title: 'Re-engagement message', message: 'Outside window' }],
          },
        ],
      })
    );
    expect(statuses[0]).toMatchObject({ status: 'failed', error: 'Outside window' });
  });

  it('ignores statuses it does not model', () => {
    const { statuses } = normalizeWhatsAppWebhook(
      envelope({ statuses: [{ id: 'w1', status: 'deleted' }] })
    );
    expect(statuses).toHaveLength(0);
  });
});

describe('normalizeWhatsAppWebhook — malformed input', () => {
  it('returns empty results rather than throwing', () => {
    for (const body of [null, undefined, {}, { entry: null }, { entry: [{}] }, 'nonsense']) {
      expect(normalizeWhatsAppWebhook(body)).toEqual({ messages: [], statuses: [] });
    }
  });
});
