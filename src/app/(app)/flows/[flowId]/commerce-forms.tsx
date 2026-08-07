'use client';

import styles from './builder.module.css';

/**
 * Config editors for the commerce nodes.
 *
 * Separate from config-forms.tsx purely for size — same contract: `config` is
 * an untyped bag crossing the client boundary, re-validated server-side against
 * the node's zod schema on save.
 */

type Config = Record<string, unknown>;
type Props = { config: Config; onChange: (config: Config) => void };

const VARIABLE_HINT = 'Use {{variable}} to drop in something collected earlier.';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <span className={styles.fieldHint}>{hint}</span>}
    </label>
  );
}

export function CatalogBrowseForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="Asking which category" hint={VARIABLE_HINT}>
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.categoryPrompt ?? '')}
          onChange={(e) => onChange({ ...config, categoryPrompt: e.target.value })}
        />
      </Field>

      <Field label="Asking which item">
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.itemPrompt ?? '')}
          onChange={(e) => onChange({ ...config, itemPrompt: e.target.value })}
        />
      </Field>

      <Field
        label="Only show"
        hint="Leave as Everything unless you sell more than one kind of thing."
      >
        <select
          className={styles.select}
          value={String(config.itemType ?? '')}
          onChange={(e) => onChange({ ...config, itemType: e.target.value || undefined })}
        >
          <option value="">Everything</option>
          <option value="menu_item">Menu items</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
        </select>
      </Field>

      <Field
        label="If nothing is available"
        hint="Sent when every item is marked unavailable — a sold-out evening, for example."
      >
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.emptyMessage ?? '')}
          onChange={(e) => onChange({ ...config, emptyMessage: e.target.value })}
        />
      </Field>

      <p className={styles.staticNote}>
        Reads your live list from <strong>Menu &amp; Services</strong>. Mark something
        unavailable there and the bot stops offering it immediately.
      </p>
    </>
  );
}

export function CartReviewForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="What you say" hint={VARIABLE_HINT}>
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.prompt ?? '')}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
        />
      </Field>

      <Field label="Add-more button">
        <input
          className={styles.input}
          maxLength={20}
          value={String(config.addMoreLabel ?? '')}
          onChange={(e) => onChange({ ...config, addMoreLabel: e.target.value })}
        />
      </Field>

      <Field label="Checkout button">
        <input
          className={styles.input}
          maxLength={20}
          value={String(config.checkoutLabel ?? '')}
          onChange={(e) => onChange({ ...config, checkoutLabel: e.target.value })}
        />
      </Field>

      <p className={styles.staticNote}>
        The cart contents and total are appended automatically — you do not need to write
        them in.
      </p>
    </>
  );
}

export function CreateOrderForm({ config, onChange }: Props) {
  return (
    <>
      <Field
        label="Delivery or pickup is stored in"
        hint="The name you saved that answer as earlier in the flow."
      >
        <input
          className={styles.input}
          value={String(config.fulfillmentVariable ?? '')}
          onChange={(e) => onChange({ ...config, fulfillmentVariable: e.target.value })}
          placeholder="fulfilment"
        />
      </Field>

      <Field label="Address is stored in" hint="Only used for delivery orders.">
        <input
          className={styles.input}
          value={String(config.addressVariable ?? '')}
          onChange={(e) => onChange({ ...config, addressVariable: e.target.value })}
          placeholder="address"
        />
      </Field>

      <Field label="Payment method is stored in">
        <input
          className={styles.input}
          value={String(config.paymentMethodVariable ?? '')}
          onChange={(e) => onChange({ ...config, paymentMethodVariable: e.target.value })}
          placeholder="payment_method"
        />
      </Field>

      <Field
        label="Delivery fee"
        hint="In minor units — 15000 is Rs. 150. Leave 0 for free delivery."
      >
        <input
          className={styles.input}
          type="number"
          min={0}
          value={Number(config.deliveryFeeMinor ?? 0)}
          onChange={(e) => onChange({ ...config, deliveryFeeMinor: Number(e.target.value) })}
        />
      </Field>

      <Field
        label="Confirmation message"
        hint="The order code and total are filled in for you."
      >
        <textarea
          className={styles.textarea}
          rows={4}
          value={String(config.confirmationMessage ?? '')}
          onChange={(e) => onChange({ ...config, confirmationMessage: e.target.value })}
        />
      </Field>
    </>
  );
}

export function OrderStatusForm({ config, onChange }: Props) {
  return (
    <>
      <Field
        label="If they have no orders"
        hint="Sent when the customer has never ordered from you."
      >
        <textarea
          className={styles.textarea}
          rows={3}
          value={String(config.notFoundMessage ?? '')}
          onChange={(e) => onChange({ ...config, notFoundMessage: e.target.value })}
        />
      </Field>

      <p className={styles.staticNote}>
        The order is found from the customer&rsquo;s own record — they never have to type
        an order number.
      </p>
    </>
  );
}

export function BookingSlotsForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="Asking which day" hint={VARIABLE_HINT}>
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.datePrompt ?? '')}
          onChange={(e) => onChange({ ...config, datePrompt: e.target.value })}
        />
      </Field>

      <Field label="Asking which time">
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.slotPrompt ?? '')}
          onChange={(e) => onChange({ ...config, slotPrompt: e.target.value })}
        />
      </Field>

      <Field label="How far ahead to offer" hint="WhatsApp lists show at most 10 rows.">
        <select
          className={styles.select}
          value={String(config.daysAhead ?? 7)}
          onChange={(e) => onChange({ ...config, daysAhead: Number(e.target.value) })}
        >
          {[3, 5, 7, 10].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Party size is stored in"
        hint="Optional. Stops a table for two being offered to a party of six."
      >
        <input
          className={styles.input}
          value={String(config.partySizeVariable ?? '')}
          onChange={(e) =>
            onChange({ ...config, partySizeVariable: e.target.value || undefined })
          }
          placeholder="party_size"
        />
      </Field>

      <Field label="If nothing is free">
        <textarea
          className={styles.textarea}
          rows={2}
          value={String(config.noSlotsMessage ?? '')}
          onChange={(e) => onChange({ ...config, noSlotsMessage: e.target.value })}
        />
      </Field>

      <p className={styles.staticNote}>
        Times come from the opening hours set on each resource in{' '}
        <strong>Bookings</strong>. Slots already taken, and times in the past, are never
        offered.
      </p>
    </>
  );
}

export function CreateBookingForm({ config, onChange }: Props) {
  return (
    <>
      <Field label="Party size is stored in" hint="Optional.">
        <input
          className={styles.input}
          value={String(config.partySizeVariable ?? '')}
          onChange={(e) =>
            onChange({ ...config, partySizeVariable: e.target.value || undefined })
          }
          placeholder="party_size"
        />
      </Field>

      <Field
        label="Notes are stored in"
        hint="Optional. Shown to your team on the booking."
      >
        <input
          className={styles.input}
          value={String(config.notesVariable ?? '')}
          onChange={(e) =>
            onChange({ ...config, notesVariable: e.target.value || undefined })
          }
          placeholder="notes"
        />
      </Field>

      <Field
        label="Confirmation message"
        hint="The booking code and time are filled in for you."
      >
        <textarea
          className={styles.textarea}
          rows={4}
          value={String(config.confirmationMessage ?? '')}
          onChange={(e) => onChange({ ...config, confirmationMessage: e.target.value })}
        />
      </Field>

      <p className={styles.staticNote}>
        If someone else takes the slot first, the flow follows its <strong>taken</strong>{' '}
        exit so the customer can pick again — connect that back to the times step.
      </p>
    </>
  );
}
