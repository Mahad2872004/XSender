import type {
  FulfillmentType,
  Json,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from '@/lib/database.types';
import { formatMoney } from '@/lib/money';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * Orders captured in chat.
 *
 * The cart lives in flow_run.variables while the conversation is in progress —
 * a half-finished order is not an order. It becomes a row here only when the
 * customer confirms.
 */

export interface CartLine {
  catalogItemId: string | null;
  name: string;
  unitPriceMinor: number;
  quantity: number;
  selectedOptions?: Array<{ name: string; choice: string; priceDeltaMinor: number }>;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export function cartSubtotalMinor(lines: CartLine[]): number {
  return lines.reduce((total, line) => {
    const optionsDelta = (line.selectedOptions ?? []).reduce(
      (sum, option) => sum + option.priceDeltaMinor,
      0
    );
    return total + (line.unitPriceMinor + optionsDelta) * line.quantity;
  }, 0);
}

export async function createOrder(
  ctx: WorkspaceContext,
  input: {
    contactId: string;
    conversationId?: string | null;
    lines: CartLine[];
    fulfillment: FulfillmentType;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    scheduledFor?: Date | null;
    paymentMethod?: PaymentMethod | null;
    deliveryFeeMinor?: number;
    notes?: string | null;
    placedBy?: 'flow' | 'agent';
  }
): Promise<OrderWithItems> {
  if (input.lines.length === 0) {
    throw new Error('Cannot create an order with an empty cart.');
  }

  const { data: code, error: codeError } = await ctx.db.rpc('next_order_code', {
    ws: ctx.workspaceId,
  });
  if (codeError || !code) {
    throw new Error(`Could not allocate an order code: ${codeError?.message}`);
  }

  const subtotal = cartSubtotalMinor(input.lines);
  const deliveryFee = input.deliveryFeeMinor ?? 0;

  const { data: order, error } = await ctx
    .table('orders')
    .insert({
      contact_id: input.contactId,
      conversation_id: input.conversationId ?? null,
      code,
      status: 'confirmed',
      fulfillment: input.fulfillment,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      scheduled_for: input.scheduledFor?.toISOString() ?? null,
      payment_method: input.paymentMethod ?? null,
      payment_status: input.paymentMethod === 'cash' ? 'unpaid' : 'pending',
      subtotal_minor: subtotal,
      delivery_fee_minor: deliveryFee,
      total_minor: subtotal + deliveryFee,
      currency: ctx.workspace.currency,
      notes: input.notes ?? null,
      placed_by: input.placedBy ?? 'flow',
    })
    .select()
    .single();

  if (error || !order) throw new Error(`Could not create the order: ${error?.message}`);

  const itemRows = input.lines.map((line) => {
    const optionsDelta = (line.selectedOptions ?? []).reduce(
      (sum, option) => sum + option.priceDeltaMinor,
      0
    );
    const unit = line.unitPriceMinor + optionsDelta;
    return {
      order_id: order.id,
      catalog_item_id: line.catalogItemId,
      // Snapshot: editing the menu later must not rewrite this order.
      name: line.name,
      unit_price_minor: unit,
      quantity: line.quantity,
      line_total_minor: unit * line.quantity,
      selected_options: (line.selectedOptions ?? []) as unknown as Json,
    };
  });

  const [itemsResult] = await Promise.all([
    ctx.table('order_items').insert(itemRows).select(),
    ctx.table('events').insert({
      type: 'order.created',
      entity_type: 'order',
      entity_id: order.id,
      payload: {
        code: order.code,
        totalMinor: order.total_minor,
        placedBy: order.placed_by,
      } as Json,
    }),
  ]);

  if (itemsResult.error) {
    throw new Error(`Could not save order items: ${itemsResult.error.message}`);
  }

  return { ...order, items: (itemsResult.data ?? []) as OrderItem[] };
}

/**
 * Statuses in the order they normally advance, per fulfilment type.
 *
 * Drives the one-tap button on the Orders board: staff should never have to
 * pick from a dropdown of eight states to say "it's ready".
 */
export function statusPipeline(fulfillment: FulfillmentType): OrderStatus[] {
  if (fulfillment === 'delivery') {
    return ['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'completed'];
  }
  if (fulfillment === 'pickup') {
    return ['confirmed', 'preparing', 'ready', 'completed'];
  }
  return ['confirmed', 'preparing', 'ready', 'completed'];
}

export function nextStatus(order: Order): OrderStatus | null {
  const pipeline = statusPipeline(order.fulfillment);
  const index = pipeline.indexOf(order.status);
  if (index === -1 || index === pipeline.length - 1) return null;
  return pipeline[index + 1];
}

/**
 * What the customer is told when an order reaches each status.
 *
 * This is the automation the business is paying for — nobody types these.
 * Returning null means the status change is internal and needs no message.
 */
export function statusMessage(
  order: Order,
  status: OrderStatus,
  locale = 'en-US'
): string | null {
  const total = formatMoney(order.total_minor, order.currency, locale);

  switch (status) {
    case 'confirmed':
      return `Order ${order.code} confirmed! Total: ${total}. We'll keep you posted.`;
    case 'preparing':
      return `Good news — we've started preparing order ${order.code}. 👨‍🍳`;
    case 'ready':
      return order.fulfillment === 'pickup'
        ? `Order ${order.code} is ready for collection. See you soon!`
        : `Order ${order.code} is ready.`;
    case 'out_for_delivery':
      return `Order ${order.code} is on its way to you now. 🛵`;
    case 'delivered':
      return `Order ${order.code} has been delivered. Enjoy!`;
    case 'completed':
      return `Thanks for ordering with us! How did we do? Reply 1–5, where 5 is excellent.`;
    case 'cancelled':
      return `Order ${order.code} has been cancelled. Message us if that wasn't expected.`;
    default:
      return null;
  }
}

export async function setOrderStatus(
  ctx: WorkspaceContext,
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  const { data, error } = await ctx
    .table('orders')
    .update({
      status,
      completed_at:
        status === 'completed' || status === 'cancelled' ? new Date().toISOString() : null,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error || !data) throw new Error(`Could not update the order: ${error?.message}`);

  await ctx.table('events').insert({
    type: 'order.status_changed',
    entity_type: 'order',
    entity_id: orderId,
    actor_user_id: ctx.userId === 'system' ? null : ctx.userId,
    payload: { code: data.code, status } as Json,
  });

  return data;
}

export async function loadOrder(
  ctx: WorkspaceContext,
  orderId: string
): Promise<OrderWithItems | null> {
  const { data } = await ctx.db
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('id', orderId)
    .maybeSingle();

  return (data as unknown as OrderWithItems) ?? null;
}

export interface OrderListRow extends OrderWithItems {
  contact: { id: string; full_name: string | null; phone: string | null } | null;
}

export async function listOrders(
  ctx: WorkspaceContext,
  options: { status?: 'open' | 'all'; limit?: number } = {}
): Promise<OrderListRow[]> {
  let query = ctx.db
    .from('orders')
    .select('*, items:order_items(*), contact:contacts(id, full_name, phone)')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 100);

  if (options.status === 'open') {
    query = query.not('status', 'in', '("completed","cancelled")');
  }

  const { data } = await query;
  return (data ?? []) as unknown as OrderListRow[];
}

/** The customer's most recent order — what "track my order" resolves to. */
export async function latestOrderForContact(
  ctx: WorkspaceContext,
  contactId: string
): Promise<OrderWithItems | null> {
  const { data } = await ctx.db
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as unknown as OrderWithItems) ?? null;
}

/** Human-readable status, for both the dashboard and chat messages. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
