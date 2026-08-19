import { requireOnboarded } from '@/server/auth/session';
import { listOrders, nextStatus, ORDER_STATUS_LABEL } from '@/server/domain/orders';
import OrdersBoard, { type OrderRow } from './OrdersBoard';

export const metadata = { title: 'Orders · xSender' };

export default async function OrdersPage(props: PageProps<'/app/orders'>) {
  const searchParams = await props.searchParams;
  const showAll = searchParams.view === 'all';

  const ctx = await requireOnboarded();
  const orders = await listOrders(ctx, { status: showAll ? 'all' : 'open' });

  const rows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    code: order.code,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    // Computed here so the client does not need the pipeline rules.
    next: nextStatus(order),
    nextLabel: nextStatus(order) ? ORDER_STATUS_LABEL[nextStatus(order)!] : null,
    fulfillment: order.fulfillment,
    address: order.address,
    totalMinor: order.total_minor,
    currency: order.currency,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    placedBy: order.placed_by,
    createdAt: order.created_at,
    customerName: order.contact?.full_name ?? null,
    customerPhone: order.contact?.phone ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      lineTotalMinor: item.line_total_minor,
    })),
  }));

  return (
    <OrdersBoard
      orders={rows}
      showAll={showAll}
      currency={ctx.workspace.currency}
      locale={ctx.workspace.locale}
    />
  );
}
