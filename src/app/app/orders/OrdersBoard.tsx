'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { ArrowRight, Bot, ShoppingCart, X } from 'lucide-react';
import type {
  FulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/database.types';
import { formatMoney } from '@/lib/money';
import LocalTime from '@/components/LocalTime/LocalTime';
import { APP } from '@/lib/routes';
import { advanceOrder, cancelOrder } from './actions';
import styles from './orders.module.css';

export type OrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  statusLabel: string;
  next: OrderStatus | null;
  nextLabel: string | null;
  fulfillment: FulfillmentType;
  address: string | null;
  totalMinor: number;
  currency: string;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  placedBy: string;
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  items: Array<{ id: string; name: string; quantity: number; lineTotalMinor: number }>;
};

const FULFILLMENT_LABEL: Record<FulfillmentType, string> = {
  delivery: 'Delivery',
  pickup: 'Pickup',
  dine_in: 'Dine in',
};

export default function OrdersBoard({
  orders,
  showAll,
  currency,
  locale,
}: {
  orders: OrderRow[];
  showAll: boolean;
  currency: string;
  locale: string;
}) {
  const [pending, startTransition] = useTransition();

  const automated = orders.filter((o) => o.placedBy === 'flow').length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{showAll ? 'All orders' : 'Open orders'}</h2>
          <p className={styles.subtitle}>
            {orders.length === 0
              ? 'Orders captured in chat land here.'
              : `${orders.length} order${orders.length === 1 ? '' : 's'}` +
                (automated > 0
                  ? ` · ${automated} taken by the bot with no staff involved`
                  : '')}
          </p>
        </div>

        <div className={styles.filters}>
          <Link
            href={APP.orders}
            className={showAll ? styles.filterPill : styles.filterPillActive}
          >
            Open
          </Link>
          <Link
            href={`${APP.orders}?view=all`}
            className={showAll ? styles.filterPillActive : styles.filterPill}
          >
            All
          </Link>
        </div>
      </header>

      {orders.length === 0 && (
        <div className={styles.empty}>
          <ShoppingCart size={22} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>No orders yet</p>
          <p className={styles.emptyBody}>
            Publish an ordering flow and try it in the Simulator — orders placed there
            show up here just like real ones.
          </p>
        </div>
      )}

      <div className={styles.grid}>
        {orders.map((order) => (
          <article key={order.id} className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.code}>{order.code}</span>
              <span className={styles[`status_${order.status}`] ?? styles.status_pending}>
                {order.statusLabel}
              </span>
            </div>

            <div className={styles.customer}>
              <span className={styles.customerName}>
                {order.customerName ?? order.customerPhone ?? 'Customer'}
              </span>
              {order.placedBy === 'flow' && (
                <span className={styles.botTag} title="Captured by automation, no staff time">
                  <Bot size={11} />
                  Automated
                </span>
              )}
            </div>

            <ul className={styles.items}>
              {order.items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemQty}>{item.quantity}×</span>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemTotal}>
                    {formatMoney(item.lineTotalMinor, order.currency, locale)}
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.meta}>
              <span>{FULFILLMENT_LABEL[order.fulfillment]}</span>
              <span className={styles.dot}>·</span>
              <span>
                {order.paymentStatus === 'paid'
                  ? 'Paid'
                  : order.paymentMethod === 'cash'
                    ? 'Cash on delivery'
                    : 'Unpaid'}
              </span>
              <span className={styles.dot}>·</span>
              <LocalTime value={order.createdAt} style="datetime" />
            </div>

            {order.address && <p className={styles.address}>{order.address}</p>}

            <div className={styles.cardFoot}>
              <span className={styles.total}>
                {formatMoney(order.totalMinor, order.currency, locale)}
              </span>

              <div className={styles.actions}>
                {order.status !== 'cancelled' && order.status !== 'completed' && (
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    disabled={pending}
                    title="Cancel and tell the customer"
                    onClick={() => startTransition(() => void cancelOrder(order.id))}
                  >
                    <X size={14} />
                  </button>
                )}

                {order.next && (
                  <button
                    type="button"
                    className={styles.advanceBtn}
                    disabled={pending}
                    title={`Mark as ${order.nextLabel} and message the customer`}
                    onClick={() =>
                      startTransition(() => void advanceOrder(order.id, order.next!))
                    }
                  >
                    {order.nextLabel}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {orders.length > 0 && (
        <p className={styles.footnote}>
          Advancing an order messages the customer automatically — nobody types the
          update. Currency: {currency}.
        </p>
      )}
    </div>
  );
}
