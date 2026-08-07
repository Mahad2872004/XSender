import type { BusinessVertical } from '@/lib/database.types';
import type { FlowGraph, TriggerConfig } from '@/lib/schemas/flow';
import { restaurantOrderGraph, RESTAURANT_ORDER_ENTRY } from './restaurant-order';
import { bookingGraph, BOOKING_ENTRY } from './booking';
import { leadCaptureGraph, LEAD_CAPTURE_ENTRY } from './lead-capture';
import { faqGraph, FAQ_ENTRY } from './faq';

/**
 * The template gallery.
 *
 * One engine, four starting points. Each is a complete, publishable flow that
 * a business owner can tune rather than build from a blank canvas — which is
 * the difference between a product they can use and one they cannot.
 */

export type TemplateId = 'restaurant_order' | 'booking' | 'lead_capture' | 'faq';

export interface FlowTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  /** Verticals this is offered for first; it can still be installed anywhere. */
  verticals: BusinessVertical[];
  /** What the business stops doing by hand — the ROI line for the gallery card. */
  replaces: string;
  trigger: TriggerConfig;
  entryNodeId: string;
  build(businessName: string): FlowGraph;
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'restaurant_order',
    name: 'Order flow',
    tagline: 'Take orders in chat, end to end',
    description:
      'Menu browsing, cart, delivery or pickup, payment method, and confirmation — with table booking and a route to staff built in.',
    verticals: ['restaurant', 'ecommerce'],
    replaces: 'Staff typing out menus and taking orders by hand',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    entryNodeId: RESTAURANT_ORDER_ENTRY,
    build: restaurantOrderGraph,
  },
  {
    id: 'booking',
    name: 'Booking flow',
    tagline: 'Appointments without the back-and-forth',
    description:
      'Pick a service, collect the name and preferred time, save it to the contact, and confirm — all before anyone on your team sees it.',
    verticals: ['clinic', 'other'],
    replaces: 'Reception staff scheduling appointments over chat',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    entryNodeId: BOOKING_ENTRY,
    build: bookingGraph,
  },
  {
    id: 'lead_capture',
    name: 'Lead capture',
    tagline: 'Qualify enquiries before a person spends time on them',
    description:
      'Collects name, area, and budget, tags high-value enquiries as hot, and routes those straight to an agent with the answers attached.',
    verticals: ['real_estate'],
    replaces: 'Agents asking the same qualifying questions on every enquiry',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    entryNodeId: LEAD_CAPTURE_ENTRY,
    build: leadCaptureGraph,
  },
  {
    id: 'faq',
    name: 'FAQ auto-reply',
    tagline: 'Answer the questions you answer every day',
    description:
      'Opening hours, location, delivery, and pricing — answered instantly, with anything unexpected handed to a person.',
    verticals: ['restaurant', 'clinic', 'real_estate', 'ecommerce', 'other'],
    replaces: 'Repeating the same four answers dozens of times a day',
    trigger: { type: 'message_received', match: 'any', keywords: [] },
    entryNodeId: FAQ_ENTRY,
    build: faqGraph,
  },
];

export function templateById(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find((t) => t.id === id);
}

/** Gallery ordering: templates for this vertical first, the rest after. */
export function templatesForVertical(vertical: BusinessVertical): FlowTemplate[] {
  return [...FLOW_TEMPLATES].sort((a, b) => {
    const aMatch = a.verticals.includes(vertical) ? 0 : 1;
    const bMatch = b.verticals.includes(vertical) ? 0 : 1;
    return aMatch - bMatch;
  });
}

/**
 * What a new workspace starts with: the vertical's own template, plus FAQ,
 * which every business wants regardless.
 */
export function starterTemplatesFor(vertical: BusinessVertical): FlowTemplate[] {
  const primary = FLOW_TEMPLATES.find(
    (t) => t.id !== 'faq' && t.verticals.includes(vertical)
  );
  const faq = FLOW_TEMPLATES.find((t) => t.id === 'faq')!;
  return primary ? [primary, faq] : [faq];
}
