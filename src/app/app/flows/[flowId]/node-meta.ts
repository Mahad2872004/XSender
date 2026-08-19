import {
  Zap,
  MessageSquare,
  HelpCircle,
  GitBranch,
  Variable,
  UserCog,
  Timer,
  Globe,
  UserRound,
  Square,
  UtensilsCrossed,
  ShoppingCart,
  Receipt,
  PackageSearch,
  CalendarClock,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react';
import type { NodeType } from '@/lib/schemas/flow';

/**
 * Presentation metadata for node types.
 *
 * Kept on the client side of the boundary: the server's NodeDefinition carries
 * executors and zod schemas, none of which should be pulled into the browser
 * bundle just to draw a card.
 */
export interface NodeMeta {
  label: string;
  icon: LucideIcon;
  /** Drives the card's accent colour. */
  tone: 'trigger' | 'message' | 'logic' | 'domain' | 'escape';
  hint: string;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  trigger: {
    label: 'Trigger',
    icon: Zap,
    tone: 'trigger',
    hint: 'Where the flow starts',
  },
  send_message: {
    label: 'Send message',
    icon: MessageSquare,
    tone: 'message',
    hint: 'Say something, do not wait',
  },
  ask_question: {
    label: 'Ask a question',
    icon: HelpCircle,
    tone: 'message',
    hint: 'Ask, save the answer, branch on it',
  },
  condition: {
    label: 'Condition',
    icon: GitBranch,
    tone: 'logic',
    hint: 'Branch on something collected earlier',
  },
  set_variable: {
    label: 'Set variable',
    icon: Variable,
    tone: 'logic',
    hint: 'Store or compute a value',
  },
  update_contact: {
    label: 'Update contact',
    icon: UserCog,
    tone: 'domain',
    hint: 'Save answers to the customer record',
  },
  delay: {
    label: 'Wait',
    icon: Timer,
    tone: 'logic',
    hint: 'Pause, then carry on',
  },
  http_request: {
    label: 'HTTP request',
    icon: Globe,
    tone: 'logic',
    hint: 'Call an external service',
  },
  handoff_to_human: {
    label: 'Hand to a human',
    icon: UserRound,
    tone: 'escape',
    hint: 'Stop automating, alert the team',
  },
  end: {
    label: 'End',
    icon: Square,
    tone: 'logic',
    hint: 'Finish the flow',
  },
  catalog_browse: {
    label: 'Show the menu',
    icon: UtensilsCrossed,
    tone: 'domain',
    hint: 'Browse your real menu, add to cart',
  },
  cart_review: {
    label: 'Review the cart',
    icon: ShoppingCart,
    tone: 'domain',
    hint: 'Show the cart, add more or check out',
  },
  create_order: {
    label: 'Place the order',
    icon: Receipt,
    tone: 'domain',
    hint: 'Turn the cart into a real order',
  },
  order_status: {
    label: 'Track an order',
    icon: PackageSearch,
    tone: 'domain',
    hint: 'Look up their latest order',
  },
  booking_slots: {
    label: 'Offer times',
    icon: CalendarClock,
    tone: 'domain',
    hint: 'Show days and times you have free',
  },
  create_booking: {
    label: 'Confirm booking',
    icon: CalendarCheck,
    tone: 'domain',
    hint: 'Claim the slot and confirm',
  },
};

/** Palette order — most-used first, escape hatch last. */
export const PALETTE_ORDER: NodeType[] = [
  'send_message',
  'ask_question',
  'catalog_browse',
  'cart_review',
  'create_order',
  'order_status',
  'booking_slots',
  'create_booking',
  'condition',
  'set_variable',
  'update_contact',
  'delay',
  'http_request',
  'handoff_to_human',
  'end',
];

/** Sensible starting config so a dragged-in node is valid immediately. */
export function defaultConfigFor(type: NodeType): Record<string, unknown> {
  switch (type) {
    case 'send_message':
      return { body: { kind: 'text', text: 'Hello!' } };
    case 'ask_question':
      return {
        prompt: 'What would you like?',
        saveAs: 'answer',
        maxAttempts: 3,
        expects: { kind: 'text' },
      };
    case 'condition':
      return { variable: 'answer', comparator: 'is_set' };
    case 'set_variable':
      return { assignments: [{ name: 'my_value', value: '' }] };
    case 'update_contact':
      return { fields: [], addTags: [] };
    case 'delay':
      return { duration: 15, unit: 'minutes' };
    case 'http_request':
      return { method: 'POST', url: 'https://example.com/hook', headers: {}, timeoutMs: 10000 };
    case 'handoff_to_human':
      return { message: 'Connecting you to our team — one moment.', tags: [] };
    case 'end':
      return {};
    case 'catalog_browse':
      return {
        categoryPrompt: 'What are you in the mood for?',
        itemPrompt: 'Good choice. Which one would you like?',
        skipCategoryWhenSingle: true,
        askQuantity: false,
        emptyMessage: 'Our menu is being updated — please check back shortly.',
      };
    case 'cart_review':
      return {
        prompt: 'Here is your order so far.',
        addMoreLabel: 'Add more',
        checkoutLabel: 'Checkout',
      };
    case 'create_order':
      return {
        fulfillmentVariable: 'fulfilment',
        addressVariable: 'address',
        paymentMethodVariable: 'payment_method',
        deliveryFeeMinor: 0,
        saveAs: 'order_code',
        confirmationMessage:
          'Order {{order_code}} confirmed! 🎉\nTotal: {{order_total}}\nEstimated time: 35–40 minutes.',
      };
    case 'order_status':
      return { notFoundMessage: "I couldn't find a recent order for you." };
    case 'booking_slots':
      return {
        datePrompt: 'Which day works for you?',
        slotPrompt: 'Here are the times we have free.',
        daysAhead: 7,
        noSlotsMessage:
          'We have nothing free then. Would you like to speak to our team?',
      };
    case 'create_booking':
      return {
        saveAs: 'booking_code',
        confirmationMessage:
          'Booked ✅ {{booking_code}}\n{{booking_time}}\n\nWe will send a reminder beforehand.',
      };
    default:
      return {};
  }
}

/** One-line summary shown on the card, so the canvas is readable at a glance. */
export function summarise(type: NodeType, config: Record<string, unknown>): string {
  switch (type) {
    case 'send_message': {
      const body = config.body as { kind?: string; text?: string; templateName?: string } | undefined;
      if (body?.kind === 'text') return body.text ?? '';
      if (body?.kind === 'template') return `Template: ${body.templateName ?? ''}`;
      return 'Media message';
    }
    case 'ask_question':
      return String(config.prompt ?? '');
    case 'condition':
      return `${config.variable ?? '?'} ${String(config.comparator ?? '').replace(/_/g, ' ')} ${config.value ?? ''}`.trim();
    case 'set_variable': {
      const assignments = (config.assignments as Array<{ name: string }>) ?? [];
      return assignments.map((a) => a.name).join(', ') || 'No assignments';
    }
    case 'delay':
      return `Wait ${config.duration ?? '?'} ${config.unit ?? ''}`;
    case 'http_request':
      return `${config.method ?? 'POST'} ${config.url ?? ''}`;
    case 'handoff_to_human':
      return String(config.message ?? 'Hand over to a person');
    case 'catalog_browse':
      return String(config.categoryPrompt ?? 'Browse the menu');
    case 'cart_review':
      return String(config.prompt ?? 'Show the cart');
    case 'create_order':
      return 'Create the order and confirm it';
    case 'order_status':
      return 'Look up their latest order';
    case 'booking_slots':
      return String(config.datePrompt ?? 'Offer available times');
    case 'create_booking':
      return 'Claim the slot and confirm';
    case 'update_contact': {
      const fields = (config.fields as Array<{ field: string }>) ?? [];
      return fields.length > 0 ? fields.map((f) => f.field).join(', ') : 'Add tags only';
    }
    case 'trigger':
      return 'Starts when a message arrives';
    case 'end':
      return 'Flow finishes here';
    default:
      return '';
  }
}
