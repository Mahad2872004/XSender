import { z } from 'zod';
import { QuickReplySchema, ListSectionSchema } from './message';

/**
 * Flow graph and node configuration schemas.
 *
 * These are shared between the builder UI (which renders forms from them) and
 * the executor (which validates before running). One definition, so a node the
 * canvas can produce is always one the engine can run.
 */

// ---------------------------------------------------------------------------
// Triggers — what starts a flow
// ---------------------------------------------------------------------------

export const TriggerConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message_received'),
    /**
     * any           — every inbound message
     * first_contact — only the customer's very first message
     * keyword       — inbound text matching one of `keywords`
     */
    match: z.enum(['any', 'first_contact', 'keyword']).default('any'),
    keywords: z.array(z.string().min(1)).default([]),
  }),
  z.object({
    type: z.literal('event'),
    /** e.g. 'order.status_changed', 'booking.created' */
    event: z.string().min(1),
  }),
  z.object({
    type: z.literal('manual'),
  }),
]);

export type TriggerConfig = z.infer<typeof TriggerConfigSchema>;

// ---------------------------------------------------------------------------
// Node configs
// ---------------------------------------------------------------------------

/**
 * Message bodies support {{variable}} interpolation against flow_run.variables.
 * Resolved by renderTemplate() in src/server/flow/template.ts.
 */
const TemplatedText = z.string().min(1).max(4096);

export const SendMessageConfigSchema = z.object({
  body: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text'), text: TemplatedText }),
    z.object({
      kind: z.literal('media'),
      mediaType: z.enum(['image', 'video', 'audio', 'document']),
      mediaUrl: z.string().url(),
      caption: z.string().max(1024).optional(),
    }),
    z.object({
      kind: z.literal('template'),
      templateName: z.string().min(1),
      language: z.string().default('en'),
      variables: z.record(z.string(), z.string()).default({}),
    }),
  ]),
});

/**
 * Ask a question and park until the customer answers.
 *
 * `saveAs` names the variable the answer lands in. `buttons`/`sections` give
 * one outgoing edge per option (handle = option id), plus a `fallback` handle
 * for unrecognised replies.
 */
export const AskQuestionConfigSchema = z.object({
  prompt: TemplatedText,
  saveAs: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Use a plain identifier, e.g. party_size'),
  expects: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('text') }),
    z.object({ kind: z.literal('number'), min: z.number().optional(), max: z.number().optional() }),
    z.object({ kind: z.literal('email') }),
    z.object({ kind: z.literal('phone') }),
    z.object({ kind: z.literal('date') }),
    z.object({ kind: z.literal('location') }),
    z.object({ kind: z.literal('buttons'), buttons: z.array(QuickReplySchema).min(1).max(3) }),
    z.object({ kind: z.literal('list'), buttonLabel: z.string().default('Choose'), sections: z.array(ListSectionSchema).min(1) }),
  ]),
  /** How many invalid answers before taking the `fallback` edge. */
  maxAttempts: z.number().int().min(1).max(5).default(3),
  retryMessage: z.string().max(1024).optional(),
});

const ComparatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_set',
  'is_empty',
]);

/** Branches to the `true` or `false` handle. */
export const ConditionConfigSchema = z.object({
  variable: z.string().min(1),
  comparator: ComparatorSchema,
  value: z.string().optional(),
});

export const SetVariableConfigSchema = z.object({
  assignments: z
    .array(
      z.object({
        name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
        value: z.string(),
      })
    )
    .min(1),
});

export const DelayConfigSchema = z.object({
  duration: z.number().int().min(1),
  unit: z.enum(['seconds', 'minutes', 'hours', 'days']).default('minutes'),
});

export const HandoffConfigSchema = z.object({
  /** Sent so the customer knows a person is coming; blank sends nothing. */
  message: z.string().max(1024).default('Connecting you to our team — one moment.'),
  /** Tags applied to the conversation so the Inbox can route it. */
  tags: z.array(z.string()).default([]),
  note: z.string().max(500).optional(),
});

export const HttpRequestConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().optional(),
  saveAs: z.string().max(64).optional(),
  timeoutMs: z.number().int().min(1000).max(30_000).default(10_000),
});

export const UpdateContactConfigSchema = z.object({
  fields: z
    .array(
      z.object({
        field: z.enum(['full_name', 'phone', 'email']).or(z.string().min(1)),
        value: z.string(),
      })
    )
    .default([]),
  addTags: z.array(z.string()).default([]),
});

export const EndConfigSchema = z.object({
  reason: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Commerce nodes
// ---------------------------------------------------------------------------

/**
 * Browse the catalog and add one item to the cart.
 *
 * A composite: it asks for a category, then an item, then adds the choice —
 * three questions that would otherwise be six nodes the business owner has to
 * keep in sync with their menu by hand.
 */
export const CatalogBrowseConfigSchema = z.object({
  categoryPrompt: TemplatedText.default('What are you in the mood for?'),
  itemPrompt: TemplatedText.default('Good choice. Which one would you like?'),
  /** Restrict to one kind of catalog entry; blank means all. */
  itemType: z.enum(['menu_item', 'product', 'service']).optional(),
  /** Skip straight to items when there is only one category worth showing. */
  skipCategoryWhenSingle: z.boolean().default(true),
  askQuantity: z.boolean().default(false),
  emptyMessage: z.string().max(1024).default('Our menu is being updated — please check back shortly.'),
});

export const CartReviewConfigSchema = z.object({
  prompt: TemplatedText.default('Here is your order so far.'),
  addMoreLabel: z.string().max(20).default('Add more'),
  checkoutLabel: z.string().max(20).default('Checkout'),
});

export const CreateOrderConfigSchema = z.object({
  /** Variable holding 'delivery' | 'pickup' | 'dine_in'. */
  fulfillmentVariable: z.string().default('fulfilment'),
  addressVariable: z.string().default('address').optional(),
  paymentMethodVariable: z.string().default('payment_method').optional(),
  deliveryFeeMinor: z.number().int().min(0).default(0),
  /** Where the new order's code lands, for use in later messages. */
  saveAs: z.string().default('order_code'),
  confirmationMessage: TemplatedText.default(
    'Order {{order_code}} confirmed! 🎉\nTotal: {{order_total}}\nEstimated time: 35–40 minutes.'
  ),
});

export const OrderStatusConfigSchema = z.object({
  /** Blank looks up the customer's most recent order. */
  orderCodeVariable: z.string().optional(),
  notFoundMessage: z.string().max(1024).default("I couldn't find a recent order for you."),
});

export const BookingSlotsConfigSchema = z.object({
  datePrompt: TemplatedText.default('Which day works for you?'),
  slotPrompt: TemplatedText.default('Here are the times we have free.'),
  /** How many days ahead to offer. */
  daysAhead: z.number().int().min(1).max(60).default(7),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  partySizeVariable: z.string().optional(),
  noSlotsMessage: z
    .string()
    .max(1024)
    .default('We have nothing free then. Would you like to speak to our team?'),
});

export const CreateBookingConfigSchema = z.object({
  saveAs: z.string().default('booking_code'),
  partySizeVariable: z.string().optional(),
  notesVariable: z.string().optional(),
  confirmationMessage: TemplatedText.default(
    'Booked ✅ {{booking_code}}\n{{booking_time}}\n\nWe will send a reminder beforehand.'
  ),
});

export const TriggerNodeConfigSchema = z.object({});

// ---------------------------------------------------------------------------
// Node type registry
// ---------------------------------------------------------------------------

export const NODE_CONFIG_SCHEMAS = {
  trigger: TriggerNodeConfigSchema,
  send_message: SendMessageConfigSchema,
  ask_question: AskQuestionConfigSchema,
  condition: ConditionConfigSchema,
  set_variable: SetVariableConfigSchema,
  delay: DelayConfigSchema,
  handoff_to_human: HandoffConfigSchema,
  http_request: HttpRequestConfigSchema,
  update_contact: UpdateContactConfigSchema,
  end: EndConfigSchema,
  catalog_browse: CatalogBrowseConfigSchema,
  cart_review: CartReviewConfigSchema,
  create_order: CreateOrderConfigSchema,
  order_status: OrderStatusConfigSchema,
  booking_slots: BookingSlotsConfigSchema,
  create_booking: CreateBookingConfigSchema,
} as const;

export type NodeType = keyof typeof NODE_CONFIG_SCHEMAS;

export const NODE_TYPES = Object.keys(NODE_CONFIG_SCHEMAS) as NodeType[];

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(NODE_TYPES as [NodeType, ...NodeType[]]),
  /** Canvas coordinates; ignored by the executor. */
  position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  label: z.string().max(80).optional(),
  /** Validated against NODE_CONFIG_SCHEMAS[type] by validateGraph(). */
  config: z.record(z.string(), z.unknown()).default({}),
});

export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  /**
   * Which outlet of the source node this edge leaves from: 'true'/'false' for a
   * condition, an option id for a question, 'fallback' for the give-up path.
   * Undefined means the node's single default outlet.
   */
  sourceHandle: z.string().optional(),
  target: z.string().min(1),
});

export const FlowGraphSchema = z.object({
  nodes: z.array(FlowNodeSchema).min(1),
  edges: z.array(FlowEdgeSchema).default([]),
});

export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

/** Handles a node can branch on, given its config. Drives canvas rendering too. */
export function outletsFor(node: FlowNode): string[] {
  switch (node.type) {
    case 'condition':
      return ['true', 'false'];
    case 'ask_question': {
      const parsed = AskQuestionConfigSchema.safeParse(node.config);
      if (!parsed.success) return ['next', 'fallback'];
      const { expects } = parsed.data;
      if (expects.kind === 'buttons') {
        return [...expects.buttons.map((b) => b.id), 'fallback'];
      }
      if (expects.kind === 'list') {
        return [...expects.sections.flatMap((s) => s.rows.map((r) => r.id)), 'fallback'];
      }
      return ['next', 'fallback'];
    }
    case 'http_request':
      return ['success', 'error'];
    case 'catalog_browse':
      // 'empty' fires when the menu has nothing available — a real state on a
      // sold-out evening, and one that must not strand the customer.
      return ['next', 'empty', 'fallback'];
    case 'cart_review':
      return ['add_more', 'checkout', 'fallback'];
    case 'create_order':
      return ['success', 'error'];
    case 'order_status':
      return ['found', 'not_found'];
    case 'booking_slots':
      return ['next', 'no_slots', 'fallback'];
    case 'create_booking':
      // 'taken' is the race where someone else claimed the slot first.
      return ['success', 'taken', 'error'];
    case 'end':
    case 'handoff_to_human':
      return [];
    default:
      return ['next'];
  }
}
