import type { FlowGraph } from '@/lib/schemas/flow';

/**
 * FAQ auto-reply — the simplest of the four primitives, and usually the first
 * thing a business wants. Answers the handful of questions that make up most
 * of the inbox, and hands over anything else.
 */
export const FAQ_ENTRY = 'trigger';

export function faqGraph(businessName: string): FlowGraph {
  return {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 80, y: 200 }, config: {} },
      {
        id: 'menu',
        type: 'ask_question',
        label: 'Common questions',
        position: { x: 320, y: 200 },
        config: {
          prompt: `Hi, thanks for messaging ${businessName} 👋\nWhat would you like to know?`,
          saveAs: 'question',
          maxAttempts: 3,
          expects: {
            kind: 'list',
            buttonLabel: 'See questions',
            sections: [
              {
                title: 'Common questions',
                rows: [
                  { id: 'hours', title: 'Opening hours' },
                  { id: 'location', title: 'Where are you?' },
                  { id: 'delivery', title: 'Do you deliver?' },
                  { id: 'pricing', title: 'Pricing' },
                  { id: 'staff', title: 'Something else' },
                ],
              },
            ],
          },
        },
      },
      {
        id: 'hours',
        type: 'send_message',
        label: 'Hours',
        position: { x: 660, y: 40 },
        config: {
          body: { kind: 'text', text: 'We are open Monday to Saturday, 9am to 8pm. Closed Sundays.' },
        },
      },
      {
        id: 'location',
        type: 'send_message',
        label: 'Location',
        position: { x: 660, y: 150 },
        config: {
          body: { kind: 'text', text: 'You can find us on Main Boulevard. Reply “map” and we will send a pin.' },
        },
      },
      {
        id: 'delivery',
        type: 'send_message',
        label: 'Delivery',
        position: { x: 660, y: 260 },
        config: {
          body: { kind: 'text', text: 'Yes — we deliver across the city, usually within 45 minutes.' },
        },
      },
      {
        id: 'pricing',
        type: 'send_message',
        label: 'Pricing',
        position: { x: 660, y: 370 },
        config: {
          body: { kind: 'text', text: 'Prices start from Rs. 500. Tell us what you need and we will quote exactly.' },
        },
      },
      {
        id: 'anything_else',
        type: 'ask_question',
        label: 'Anything else?',
        position: { x: 1000, y: 200 },
        config: {
          prompt: 'Anything else I can help with?',
          saveAs: 'more_help',
          maxAttempts: 2,
          expects: {
            kind: 'buttons',
            buttons: [
              { id: 'more', title: 'Yes' },
              { id: 'done', title: 'No, thanks' },
            ],
          },
        },
      },
      {
        id: 'goodbye',
        type: 'send_message',
        label: 'Goodbye',
        position: { x: 1320, y: 300 },
        config: { body: { kind: 'text', text: 'Happy to help. Message us any time 👋' } },
      },
      {
        id: 'handoff',
        type: 'handoff_to_human',
        label: 'Hand to a person',
        position: { x: 660, y: 490 },
        config: { message: 'Let me get someone to help with that.', tags: ['needs-human'] },
      },
      { id: 'end', type: 'end', position: { x: 1620, y: 300 }, config: {} },
    ],
    edges: [
      { id: 'e-trigger', source: 'trigger', target: 'menu' },
      { id: 'e-hours', source: 'menu', sourceHandle: 'hours', target: 'hours' },
      { id: 'e-location', source: 'menu', sourceHandle: 'location', target: 'location' },
      { id: 'e-delivery', source: 'menu', sourceHandle: 'delivery', target: 'delivery' },
      { id: 'e-pricing', source: 'menu', sourceHandle: 'pricing', target: 'pricing' },
      { id: 'e-staff', source: 'menu', sourceHandle: 'staff', target: 'handoff' },
      { id: 'e-menu-fb', source: 'menu', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-a1', source: 'hours', target: 'anything_else' },
      { id: 'e-a2', source: 'location', target: 'anything_else' },
      { id: 'e-a3', source: 'delivery', target: 'anything_else' },
      { id: 'e-a4', source: 'pricing', target: 'anything_else' },

      // "Yes" loops back to the question list — the one intentional cycle here,
      // and safe because every pass needs a fresh customer reply.
      { id: 'e-more', source: 'anything_else', sourceHandle: 'more', target: 'menu' },
      { id: 'e-done', source: 'anything_else', sourceHandle: 'done', target: 'goodbye' },
      { id: 'e-else-fb', source: 'anything_else', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-bye', source: 'goodbye', target: 'end' },
    ],
  };
}
