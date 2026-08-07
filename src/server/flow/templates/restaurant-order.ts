import type { FlowGraph } from '@/lib/schemas/flow';

/**
 * The flagship demo from Roadmap v2 §6.
 *
 * Reads the workspace's real menu through catalog_browse and writes a real row
 * through create_order — the conversation is the same one a customer has, and
 * the result is a record staff can act on, not a transcript.
 *
 * Entry: welcome → [View Menu | Book a Table | Track Order | Talk to Staff]
 */
export const RESTAURANT_ORDER_ENTRY = 'trigger';

export function restaurantOrderGraph(businessName: string): FlowGraph {
  return {
    nodes: [
      { id: 'trigger', type: 'trigger', position: { x: 60, y: 300 }, config: {} },

      {
        id: 'welcome',
        type: 'ask_question',
        label: 'Welcome menu',
        position: { x: 280, y: 300 },
        config: {
          prompt: `Welcome to ${businessName} 👋\nWhat can I help you with?`,
          saveAs: 'main_choice',
          maxAttempts: 3,
          expects: {
            kind: 'list',
            buttonLabel: 'Choose',
            sections: [
              {
                title: 'How can we help?',
                rows: [
                  { id: 'order', title: 'View Menu', description: 'Order for delivery or pickup' },
                  { id: 'book', title: 'Book a Table', description: 'Reserve a time' },
                  { id: 'track', title: 'Track My Order', description: 'Where is my food?' },
                  { id: 'staff', title: 'Talk to Staff', description: 'Speak to a person' },
                ],
              },
            ],
          },
        },
      },

      // ---- Ordering: the real menu, a real cart, a real order ------------
      {
        id: 'browse',
        type: 'catalog_browse',
        label: 'Browse the menu',
        position: { x: 560, y: 100 },
        config: {
          categoryPrompt: 'Here is our menu. What are you in the mood for?',
          itemPrompt: 'Good choice. Which one would you like?',
          itemType: 'menu_item',
          skipCategoryWhenSingle: true,
          askQuantity: false,
          emptyMessage: 'Our kitchen is updating the menu right now — please check back shortly.',
        },
      },
      {
        id: 'cart',
        type: 'cart_review',
        label: 'Review cart',
        position: { x: 840, y: 100 },
        config: {
          prompt: 'Added! Here is your order so far.',
          addMoreLabel: 'Add more',
          checkoutLabel: 'Checkout',
        },
      },
      {
        id: 'fulfilment',
        type: 'ask_question',
        label: 'Delivery or pickup',
        position: { x: 1120, y: 100 },
        config: {
          prompt: 'Delivery or pickup?',
          saveAs: 'fulfilment',
          maxAttempts: 3,
          expects: {
            kind: 'buttons',
            buttons: [
              { id: 'delivery', title: 'Delivery' },
              { id: 'pickup', title: 'Pickup' },
            ],
          },
        },
      },
      {
        id: 'address',
        type: 'ask_question',
        label: 'Delivery address',
        position: { x: 1400, y: 20 },
        config: {
          prompt: 'What address should we deliver to?',
          saveAs: 'address',
          maxAttempts: 3,
          expects: { kind: 'text' },
        },
      },
      {
        id: 'payment',
        type: 'ask_question',
        label: 'Payment method',
        position: { x: 1680, y: 100 },
        config: {
          prompt: 'How would you like to pay?',
          saveAs: 'payment_method',
          maxAttempts: 3,
          expects: {
            kind: 'buttons',
            buttons: [
              { id: 'cash', title: 'Cash on delivery' },
              { id: 'online', title: 'Pay online' },
            ],
          },
        },
      },
      {
        id: 'place_order',
        type: 'create_order',
        label: 'Place the order',
        position: { x: 1960, y: 100 },
        config: {
          fulfillmentVariable: 'fulfilment',
          addressVariable: 'address',
          paymentMethodVariable: 'payment_method',
          deliveryFeeMinor: 0,
          saveAs: 'order_code',
          confirmationMessage:
            'Order {{order_code}} confirmed! 🎉\nTotal: {{order_total}}\nEstimated time: 35–40 minutes.\n\nWe will message you as it progresses.',
        },
      },
      {
        id: 'order_failed',
        type: 'send_message',
        label: 'Could not place',
        position: { x: 1960, y: 300 },
        config: {
          body: {
            kind: 'text',
            text: 'Something went wrong placing that order. Let me get someone to help.',
          },
        },
      },

      // ---- Tracking ------------------------------------------------------
      {
        id: 'track',
        type: 'order_status',
        label: 'Track order',
        position: { x: 560, y: 420 },
        config: { notFoundMessage: "I couldn't find a recent order for you. Would you like to place one?" },
      },

      // ---- Booking a table ------------------------------------------------
      {
        id: 'party_size',
        type: 'ask_question',
        label: 'Party size',
        position: { x: 560, y: 560 },
        config: {
          prompt: 'How many people should I book for?',
          saveAs: 'party_size',
          maxAttempts: 3,
          expects: { kind: 'number', min: 1, max: 30 },
        },
      },
      {
        id: 'slots',
        type: 'booking_slots',
        label: 'Offer times',
        position: { x: 840, y: 560 },
        config: {
          datePrompt: 'Which day would you like?',
          slotPrompt: 'Here are the tables we have free.',
          daysAhead: 7,
          partySizeVariable: 'party_size',
          noSlotsMessage: 'We are fully booked then. Shall I put you through to the team?',
        },
      },
      {
        id: 'book',
        type: 'create_booking',
        label: 'Confirm booking',
        position: { x: 1120, y: 560 },
        config: {
          saveAs: 'booking_code',
          partySizeVariable: 'party_size',
          confirmationMessage:
            'Booked ✅ {{booking_code}}\nTable for {{party_size}}, {{booking_time}}\n\nWe will send a reminder beforehand.',
        },
      },

      // ---- Human ----------------------------------------------------------
      {
        id: 'handoff',
        type: 'handoff_to_human',
        label: 'Talk to staff',
        position: { x: 840, y: 760 },
        config: {
          message: 'Connecting you to our team — one moment.',
          tags: ['needs-human'],
        },
      },

      { id: 'end', type: 'end', position: { x: 2260, y: 300 }, config: {} },
    ],

    edges: [
      { id: 'e-trigger', source: 'trigger', target: 'welcome' },

      { id: 'e-w-order', source: 'welcome', sourceHandle: 'order', target: 'browse' },
      { id: 'e-w-book', source: 'welcome', sourceHandle: 'book', target: 'party_size' },
      { id: 'e-w-track', source: 'welcome', sourceHandle: 'track', target: 'track' },
      { id: 'e-w-staff', source: 'welcome', sourceHandle: 'staff', target: 'handoff' },
      { id: 'e-w-fb', source: 'welcome', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-browse', source: 'browse', sourceHandle: 'next', target: 'cart' },
      { id: 'e-browse-empty', source: 'browse', sourceHandle: 'empty', target: 'handoff' },
      { id: 'e-browse-fb', source: 'browse', sourceHandle: 'fallback', target: 'handoff' },

      // "Add more" loops back to the menu — the only cycle here, and safe
      // because each pass waits on a fresh customer reply.
      { id: 'e-cart-more', source: 'cart', sourceHandle: 'add_more', target: 'browse' },
      { id: 'e-cart-checkout', source: 'cart', sourceHandle: 'checkout', target: 'fulfilment' },
      { id: 'e-cart-fb', source: 'cart', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-ful-del', source: 'fulfilment', sourceHandle: 'delivery', target: 'address' },
      { id: 'e-ful-pick', source: 'fulfilment', sourceHandle: 'pickup', target: 'payment' },
      { id: 'e-ful-fb', source: 'fulfilment', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-addr', source: 'address', sourceHandle: 'next', target: 'payment' },
      { id: 'e-addr-fb', source: 'address', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-pay-cash', source: 'payment', sourceHandle: 'cash', target: 'place_order' },
      { id: 'e-pay-online', source: 'payment', sourceHandle: 'online', target: 'place_order' },
      { id: 'e-pay-fb', source: 'payment', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-order-ok', source: 'place_order', sourceHandle: 'success', target: 'end' },
      { id: 'e-order-err', source: 'place_order', sourceHandle: 'error', target: 'order_failed' },
      { id: 'e-order-failed', source: 'order_failed', target: 'handoff' },

      { id: 'e-track-found', source: 'track', sourceHandle: 'found', target: 'end' },
      { id: 'e-track-none', source: 'track', sourceHandle: 'not_found', target: 'browse' },

      { id: 'e-party', source: 'party_size', sourceHandle: 'next', target: 'slots' },
      { id: 'e-party-fb', source: 'party_size', sourceHandle: 'fallback', target: 'handoff' },
      { id: 'e-slots', source: 'slots', sourceHandle: 'next', target: 'book' },
      { id: 'e-slots-none', source: 'slots', sourceHandle: 'no_slots', target: 'handoff' },
      { id: 'e-slots-fb', source: 'slots', sourceHandle: 'fallback', target: 'handoff' },

      { id: 'e-book-ok', source: 'book', sourceHandle: 'success', target: 'end' },
      // Someone else took the slot: send them back to pick another time.
      { id: 'e-book-taken', source: 'book', sourceHandle: 'taken', target: 'slots' },
      { id: 'e-book-err', source: 'book', sourceHandle: 'error', target: 'handoff' },
    ],
  };
}
