import type { FlowGraph } from '@/lib/schemas/flow';

/**
 * Lead capture and qualification — real estate, agencies, high-value services.
 *
 * Unlike ordering, the goal is not to complete a transaction in chat. It is to
 * qualify the enquiry and route a warm lead to a person, with the answers
 * already attached to the contact record so nobody re-asks them.
 */
export const LEAD_CAPTURE_ENTRY = 'trigger';

export function leadCaptureGraph(businessName: string): FlowGraph {
  return {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 80, y: 240 }, config: {} },
      {
        id: 'welcome',
        type: 'ask_question',
        label: 'What are they after',
        position: { x: 320, y: 240 },
        config: {
          prompt: `Thanks for contacting ${businessName} 👋\nWhat are you looking for?`,
          saveAs: 'intent',
          maxAttempts: 3,
          expects: {
            kind: 'buttons',
            buttons: [
              { id: 'buy', title: 'Buying' },
              { id: 'rent', title: 'Renting' },
              { id: 'staff', title: 'Talk to an agent' },
            ],
          },
        },
      },
      {
        id: 'name',
        type: 'ask_question',
        label: 'Name',
        position: { x: 640, y: 160 },
        config: {
          prompt: 'Happy to help. What is your name?',
          saveAs: 'lead_name',
          maxAttempts: 3,
          expects: { kind: 'text' },
        },
      },
      {
        id: 'area',
        type: 'ask_question',
        label: 'Area',
        position: { x: 920, y: 160 },
        config: {
          prompt: 'Which area are you interested in?',
          saveAs: 'area',
          maxAttempts: 3,
          expects: { kind: 'text' },
        },
      },
      {
        id: 'budget',
        type: 'ask_question',
        label: 'Budget',
        position: { x: 1200, y: 160 },
        config: {
          prompt: 'Roughly what budget are you working with, in rupees?',
          saveAs: 'budget',
          maxAttempts: 3,
          expects: { kind: 'number', min: 0 },
        },
      },
      {
        id: 'qualify',
        type: 'condition',
        label: 'High value?',
        position: { x: 1480, y: 160 },
        config: { variable: 'budget', comparator: 'greater_than', value: '10000000' },
      },
      {
        id: 'save_hot',
        type: 'update_contact',
        label: 'Tag as hot lead',
        position: { x: 1760, y: 60 },
        config: {
          fields: [
            { field: 'full_name', value: '{{lead_name}}' },
            { field: 'area', value: '{{area}}' },
            { field: 'budget', value: '{{budget}}' },
          ],
          addTags: ['lead', 'hot'],
        },
      },
      {
        id: 'save_standard',
        type: 'update_contact',
        label: 'Tag as lead',
        position: { x: 1760, y: 280 },
        config: {
          fields: [
            { field: 'full_name', value: '{{lead_name}}' },
            { field: 'area', value: '{{area}}' },
            { field: 'budget', value: '{{budget}}' },
          ],
          addTags: ['lead'],
        },
      },
      {
        id: 'hot_handoff',
        type: 'handoff_to_human',
        label: 'Straight to an agent',
        position: { x: 2040, y: 60 },
        config: {
          message:
            'Thank you {{lead_name}} — one of our agents will call you shortly about {{area}}.',
          tags: ['hot-lead'],
          note: 'High-budget enquiry, qualified by the bot.',
        },
      },
      {
        id: 'standard_reply',
        type: 'send_message',
        label: 'Acknowledge',
        position: { x: 2040, y: 280 },
        config: {
          body: {
            kind: 'text',
            text: 'Thanks {{lead_name}} — we have noted {{area}} and your budget. An agent will follow up with matching listings.',
          },
        },
      },
      {
        id: 'handoff',
        type: 'handoff_to_human',
        label: 'Talk to an agent',
        position: { x: 640, y: 460 },
        config: { message: 'Connecting you to an agent now.', tags: ['needs-human'] },
      },
      { id: 'end', type: 'end', position: { x: 2340, y: 280 }, config: {} },
    ],
    edges: [
      { id: 'e-trigger', source: 'trigger', target: 'welcome' },
      { id: 'e-buy', source: 'welcome', sourceHandle: 'buy', target: 'name' },
      { id: 'e-rent', source: 'welcome', sourceHandle: 'rent', target: 'name' },
      { id: 'e-staff', source: 'welcome', sourceHandle: 'staff', target: 'handoff' },
      { id: 'e-welcome-fb', source: 'welcome', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-name', source: 'name', sourceHandle: 'next', target: 'area' },
      { id: 'e-name-fb', source: 'name', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-area', source: 'area', sourceHandle: 'next', target: 'budget' },
      { id: 'e-area-fb', source: 'area', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-budget', source: 'budget', sourceHandle: 'next', target: 'qualify' },
      { id: 'e-budget-fb', source: 'budget', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-hot', source: 'qualify', sourceHandle: 'true', target: 'save_hot' },
      { id: 'e-std', source: 'qualify', sourceHandle: 'false', target: 'save_standard' },
      { id: 'e-save-hot', source: 'save_hot', target: 'hot_handoff' },
      { id: 'e-save-std', source: 'save_standard', target: 'standard_reply' },
      { id: 'e-std-end', source: 'standard_reply', target: 'end' },
    ],
  };
}
