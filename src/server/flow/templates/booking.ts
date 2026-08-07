import type { FlowGraph } from '@/lib/schemas/flow';

/**
 * Appointment booking — clinics, salons, consultants.
 *
 * Same four primitives as every other vertical: auto-reply, capture, confirm,
 * hand off. Only the wording and the fields differ, which is the whole argument
 * for one engine rather than four products.
 */
export const BOOKING_ENTRY = 'trigger';

export function bookingGraph(businessName: string): FlowGraph {
  return {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 80, y: 220 }, config: {} },
      {
        id: 'welcome',
        type: 'ask_question',
        label: 'Welcome menu',
        position: { x: 320, y: 220 },
        config: {
          prompt: `Hello, you've reached ${businessName} 👋\nHow can we help?`,
          saveAs: 'main_choice',
          maxAttempts: 3,
          expects: {
            kind: 'buttons',
            buttons: [
              { id: 'book', title: 'Book appointment' },
              { id: 'hours', title: 'Opening hours' },
              { id: 'staff', title: 'Talk to staff' },
            ],
          },
        },
      },
      {
        id: 'service',
        type: 'ask_question',
        label: 'Which service',
        position: { x: 640, y: 100 },
        config: {
          prompt: 'What would you like to book?',
          saveAs: 'service',
          maxAttempts: 3,
          expects: {
            kind: 'list',
            buttonLabel: 'See services',
            sections: [
              {
                title: 'Available',
                rows: [
                  { id: 'consultation', title: 'Consultation', description: '30 minutes' },
                  { id: 'follow_up', title: 'Follow-up visit', description: '15 minutes' },
                  { id: 'checkup', title: 'Full check-up', description: '45 minutes' },
                ],
              },
            ],
          },
        },
      },
      {
        id: 'patient_name',
        type: 'ask_question',
        label: 'Full name',
        position: { x: 920, y: 100 },
        config: {
          prompt: 'What name should the appointment be under?',
          saveAs: 'patient_name',
          maxAttempts: 3,
          expects: { kind: 'text' },
        },
      },
      {
        id: 'preferred_time',
        type: 'ask_question',
        label: 'Preferred time',
        position: { x: 1200, y: 100 },
        config: {
          prompt: 'When suits you? For example: 2026-08-14 15:00',
          saveAs: 'preferred_time',
          maxAttempts: 3,
          expects: { kind: 'date' },
        },
      },
      {
        id: 'save_contact',
        type: 'update_contact',
        label: 'Save to contact',
        position: { x: 1480, y: 100 },
        config: {
          fields: [{ field: 'full_name', value: '{{patient_name}}' }],
          addTags: ['booking'],
        },
      },
      {
        id: 'confirm',
        type: 'send_message',
        label: 'Confirm booking',
        position: { x: 1760, y: 100 },
        config: {
          body: {
            kind: 'text',
            text: 'Booked ✅\n\n{{service}} for {{patient_name}}\n{{preferred_time}}\n\nWe will send a reminder beforehand. Reply here to change it.',
          },
        },
      },
      {
        id: 'hours',
        type: 'send_message',
        label: 'Opening hours',
        position: { x: 640, y: 320 },
        config: {
          body: {
            kind: 'text',
            text: 'We are open Monday to Saturday, 9am to 8pm. Closed Sundays.',
          },
        },
      },
      {
        id: 'handoff',
        type: 'handoff_to_human',
        label: 'Talk to staff',
        position: { x: 640, y: 500 },
        config: {
          message: 'Connecting you to our team — one moment.',
          tags: ['needs-human'],
        },
      },
      { id: 'end', type: 'end', position: { x: 2040, y: 220 }, config: {} },
    ],
    edges: [
      { id: 'e-trigger', source: 'trigger', target: 'welcome' },
      { id: 'e-book', source: 'welcome', sourceHandle: 'book', target: 'service' },
      { id: 'e-hours', source: 'welcome', sourceHandle: 'hours', target: 'hours' },
      { id: 'e-staff', source: 'welcome', sourceHandle: 'staff', target: 'handoff' },
      { id: 'e-welcome-fb', source: 'welcome', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-s1', source: 'service', sourceHandle: 'consultation', target: 'patient_name' },
      { id: 'e-s2', source: 'service', sourceHandle: 'follow_up', target: 'patient_name' },
      { id: 'e-s3', source: 'service', sourceHandle: 'checkup', target: 'patient_name' },
      { id: 'e-s-fb', source: 'service', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-name', source: 'patient_name', sourceHandle: 'next', target: 'preferred_time' },
      { id: 'e-name-fb', source: 'patient_name', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-time', source: 'preferred_time', sourceHandle: 'next', target: 'save_contact' },
      { id: 'e-time-fb', source: 'preferred_time', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-save', source: 'save_contact', target: 'confirm' },
      { id: 'e-confirm', source: 'confirm', target: 'end' },
      { id: 'e-hours-end', source: 'hours', target: 'end' },
    ],
  };
}
