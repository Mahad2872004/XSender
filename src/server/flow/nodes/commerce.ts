import {
  CartReviewConfigSchema,
  CatalogBrowseConfigSchema,
  CreateOrderConfigSchema,
  OrderStatusConfigSchema,
} from '@/lib/schemas/flow';
import type { FulfillmentType, PaymentMethod } from '@/lib/database.types';
import { formatMoney } from '@/lib/money';
import { matchNumberedChoice } from '@/server/channels/types';
import { loadMenu } from '@/server/domain/catalog';
import {
  cartSubtotalMinor,
  createOrder,
  latestOrderForContact,
  ORDER_STATUS_LABEL,
  type CartLine,
} from '@/server/domain/orders';
import type { NodeDefinition } from '../node-types';
import { renderTemplate } from '../template';

/**
 * Commerce nodes.
 *
 * The cart lives in flow_run.variables under `cart` for the life of the
 * conversation — a half-built order is not an order, and should not occupy a
 * row. It is written to the orders table only when the customer confirms.
 */

const CART_VARIABLE = 'cart';

function readCart(variables: Record<string, unknown>): CartLine[] {
  const raw = variables[CART_VARIABLE];
  return Array.isArray(raw) ? (raw as CartLine[]) : [];
}

/**
 * Browse the menu and add one item.
 *
 * Implemented as a small state machine inside a single node: `stage` tracks
 * whether we are waiting on a category or an item. Modelling this as separate
 * canvas nodes would force the business owner to keep wiring in step with a
 * menu that changes weekly.
 */
export const catalogBrowseNode: NodeDefinition<typeof CatalogBrowseConfigSchema> = {
  type: 'catalog_browse',
  configSchema: CatalogBrowseConfigSchema,
  category: 'domain',
  label: 'Show the menu',
  description: 'Let the customer browse your real menu and add an item to their cart.',

  async enter(config, runtime) {
    const menu = await loadMenu(runtime.ctx);
    const groups = config.itemType
      ? menu
          .map((g) => ({ ...g, items: g.items.filter((i) => i.type === config.itemType) }))
          .filter((g) => g.items.length > 0)
      : menu;

    if (groups.length === 0) {
      runtime.send({ type: 'text', text: config.emptyMessage });
      return { kind: 'advance', handle: 'empty' };
    }

    // One category is not a choice worth making the customer make.
    if (groups.length === 1 && config.skipCategoryWhenSingle) {
      return askForItem(config, runtime, groups[0].category.id, groups);
    }

    const rows = groups.slice(0, 10).map((group) => ({
      id: group.category.id,
      title: group.category.name.slice(0, 24),
      description: `${group.items.length} item${group.items.length === 1 ? '' : 's'}`,
    }));

    runtime.send({
      type: 'list',
      text: renderTemplate(config.categoryPrompt, runtime.variables),
      buttonLabel: 'See menu',
      sections: [{ title: 'Menu', rows }],
    });

    return {
      kind: 'await',
      awaiting: {
        nodeId: '',
        kind: 'catalog_category',
        options: rows.map((r) => ({ id: r.id, title: r.title })),
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

    const menu = await loadMenu(runtime.ctx);
    const groups = config.itemType
      ? menu
          .map((g) => ({ ...g, items: g.items.filter((i) => i.type === config.itemType) }))
          .filter((g) => g.items.length > 0)
      : menu;

    if (awaiting.kind === 'catalog_category') {
      const chosen =
        groups.find((g) => g.category.id === raw) ??
        groups.find(
          (g) => g.category.id === matchNumberedChoice(raw, awaiting.options ?? [])
        );

      if (!chosen) {
        return retryOrGiveUp(runtime, awaiting, 'Please pick one of the categories above.');
      }

      return askForItem(config, runtime, chosen.category.id, groups);
    }

    // Waiting on an item.
    const allItems = groups.flatMap((g) => g.items);
    const itemId = allItems.some((i) => i.id === raw)
      ? raw
      : matchNumberedChoice(raw, awaiting.options ?? []);
    const item = allItems.find((i) => i.id === itemId);

    if (!item) {
      return retryOrGiveUp(runtime, awaiting, 'Please pick one of the items above.');
    }

    const cart = readCart(runtime.variables);
    cart.push({
      catalogItemId: item.id,
      name: item.name,
      unitPriceMinor: item.price_minor,
      quantity: 1,
    });

    runtime.setVariable(CART_VARIABLE, cart);
    runtime.setVariable('last_item', item.name);
    runtime.setVariable('cart_count', cart.length);

    const subtotal = cartSubtotalMinor(cart);
    runtime.setVariable('cart_total_minor', subtotal);
    runtime.setVariable('cart_total', formatMoney(subtotal, runtime.ctx.workspace.currency, runtime.ctx.workspace.locale));

    runtime.note({ addedItem: item.name, cartSize: cart.length });

    return { kind: 'advance', handle: 'next' };
  },
};

async function askForItem(
  config: (typeof CatalogBrowseConfigSchema)['_output'],
  runtime: Parameters<NonNullable<typeof catalogBrowseNode.resume>>[1],
  categoryId: string,
  groups: Awaited<ReturnType<typeof loadMenu>>
) {
  const group = groups.find((g) => g.category.id === categoryId);
  const items = (group?.items ?? []).slice(0, 10);

  const { currency, locale } = runtime.ctx.workspace;
  const rows = items.map((item) => ({
    id: item.id,
    title: item.name.slice(0, 24),
    description: formatMoney(item.price_minor, currency, locale).slice(0, 72),
  }));

  runtime.send({
    type: 'list',
    text: renderTemplate(config.itemPrompt, runtime.variables),
    buttonLabel: 'Choose',
    sections: [{ title: group?.category.name.slice(0, 24) ?? 'Items', rows }],
  });

  return {
    kind: 'await' as const,
    awaiting: {
      nodeId: '',
      kind: 'catalog_item',
      options: rows.map((r) => ({ id: r.id, title: r.title })),
      attempts: 0,
    },
  };
}

function retryOrGiveUp(
  runtime: Parameters<NonNullable<typeof catalogBrowseNode.resume>>[1],
  awaiting: { nodeId: string; kind: string; options?: Array<{ id: string; title: string }>; attempts: number },
  message: string
) {
  const attempts = awaiting.attempts + 1;
  if (attempts >= 3) return { kind: 'advance' as const, handle: 'fallback' };

  runtime.send({ type: 'text', text: message });
  return { kind: 'await' as const, awaiting: { ...awaiting, attempts } };
}

// ---------------------------------------------------------------------------

export const cartReviewNode: NodeDefinition<typeof CartReviewConfigSchema> = {
  type: 'cart_review',
  configSchema: CartReviewConfigSchema,
  category: 'domain',
  label: 'Review the cart',
  description: 'Show what is in the cart and offer to add more or check out.',

  async enter(config, runtime) {
    const cart = readCart(runtime.variables);

    if (cart.length === 0) {
      runtime.send({ type: 'text', text: 'Your cart is empty.' });
      return { kind: 'advance', handle: 'add_more' };
    }

    const { currency, locale } = runtime.ctx.workspace;
    const lines = cart
      .map((line) => `• ${line.quantity} × ${line.name} — ${formatMoney(line.unitPriceMinor * line.quantity, currency, locale)}`)
      .join('\n');
    const subtotal = cartSubtotalMinor(cart);

    runtime.send({
      type: 'buttons',
      text: `${renderTemplate(config.prompt, runtime.variables)}\n\n${lines}\n\nTotal: ${formatMoney(subtotal, currency, locale)}`,
      buttons: [
        { id: 'add_more', title: config.addMoreLabel },
        { id: 'checkout', title: config.checkoutLabel },
      ],
    });

    return {
      kind: 'await',
      awaiting: {
        nodeId: '',
        kind: 'buttons',
        options: [
          { id: 'add_more', title: config.addMoreLabel },
          { id: 'checkout', title: config.checkoutLabel },
        ],
        attempts: 0,
      },
    };
  },

  async resume(_config, runtime, input, awaiting) {
    const raw = input.payload.type === 'reply' ? input.payload.replyId : '';
    const choice =
      raw === 'add_more' || raw === 'checkout'
        ? raw
        : matchNumberedChoice(
            input.payload.type === 'text' ? input.payload.text : raw,
            awaiting.options ?? []
          );

    if (!choice) return retryOrGiveUp(runtime, awaiting, 'Please choose one of the options.');
    return { kind: 'advance', handle: choice };
  },
};

// ---------------------------------------------------------------------------

export const createOrderNode: NodeDefinition<typeof CreateOrderConfigSchema> = {
  type: 'create_order',
  configSchema: CreateOrderConfigSchema,
  category: 'domain',
  label: 'Place the order',
  description: 'Turn the cart into a real order and confirm it to the customer.',

  async enter(config, runtime) {
    const cart = readCart(runtime.variables);

    if (cart.length === 0) {
      runtime.note({ error: 'cart empty at checkout' });
      return { kind: 'advance', handle: 'error' };
    }

    const fulfillment = normaliseFulfillment(
      runtime.variables[config.fulfillmentVariable]
    );
    const paymentMethod = config.paymentMethodVariable
      ? normalisePaymentMethod(runtime.variables[config.paymentMethodVariable])
      : null;

    const address = config.addressVariable
      ? (runtime.variables[config.addressVariable] as string | undefined)
      : undefined;

    try {
      const order = await createOrder(runtime.ctx, {
        contactId: runtime.contact.id,
        conversationId: runtime.conversation.id,
        lines: cart,
        fulfillment,
        address: fulfillment === 'delivery' ? (address ?? null) : null,
        paymentMethod,
        deliveryFeeMinor: fulfillment === 'delivery' ? config.deliveryFeeMinor : 0,
        placedBy: 'flow',
      });

      const { currency, locale } = runtime.ctx.workspace;
      runtime.setVariable(config.saveAs, order.code);
      runtime.setVariable('order_id', order.id);
      runtime.setVariable('order_total', formatMoney(order.total_minor, currency, locale));
      // The cart has become an order; leaving it would let a later node
      // double-charge for the same items.
      runtime.setVariable(CART_VARIABLE, []);

      runtime.send({
        type: 'text',
        text: renderTemplate(config.confirmationMessage, runtime.variables),
      });

      runtime.note({ orderCode: order.code, totalMinor: order.total_minor });
      return { kind: 'advance', handle: 'success' };
    } catch (cause) {
      runtime.note({ error: cause instanceof Error ? cause.message : String(cause) });
      return { kind: 'advance', handle: 'error' };
    }
  },
};

function normaliseFulfillment(value: unknown): FulfillmentType {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('pick')) return 'pickup';
  if (text.includes('dine') || text.includes('table')) return 'dine_in';
  return 'delivery';
}

function normalisePaymentMethod(value: unknown): PaymentMethod | null {
  const text = String(value ?? '').toLowerCase();
  if (!text) return null;
  if (text.includes('cash') || text === 'cod') return 'cash';
  if (text.includes('card')) return 'card';
  if (text.includes('wallet') || text.includes('jazz') || text.includes('easy')) return 'wallet';
  if (text.includes('bank') || text.includes('transfer')) return 'bank_transfer';
  if (text.includes('online') || text.includes('pay')) return 'online';
  return null;
}

// ---------------------------------------------------------------------------

export const orderStatusNode: NodeDefinition<typeof OrderStatusConfigSchema> = {
  type: 'order_status',
  configSchema: OrderStatusConfigSchema,
  category: 'domain',
  label: 'Track an order',
  description: "Tell the customer where their most recent order has got to.",

  async enter(config, runtime) {
    // Resolved from the contact record: making a customer type an order id is
    // exactly the friction this product exists to remove.
    const order = await latestOrderForContact(runtime.ctx, runtime.contact.id);

    if (!order) {
      runtime.send({ type: 'text', text: config.notFoundMessage });
      return { kind: 'advance', handle: 'not_found' };
    }

    const { currency, locale } = runtime.ctx.workspace;
    const items = order.items
      .map((item) => `• ${item.quantity} × ${item.name}`)
      .join('\n');

    runtime.setVariable('order_code', order.code);
    runtime.setVariable('order_status', ORDER_STATUS_LABEL[order.status]);

    runtime.send({
      type: 'text',
      text: `Order ${order.code}\nStatus: ${ORDER_STATUS_LABEL[order.status]}\n\n${items}\n\nTotal: ${formatMoney(order.total_minor, currency, locale)}`,
    });

    runtime.note({ orderCode: order.code, status: order.status });
    return { kind: 'advance', handle: 'found' };
  },
};
