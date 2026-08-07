'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import type { BusinessVertical, CatalogItemType } from '@/lib/database.types';
import { formatMoney } from '@/lib/money';
import {
  addCategory,
  addItem,
  removeCategory,
  removeItem,
  setItemAvailability,
} from './actions';
import { EMPTY_MENU_STATE } from './form-state';
import styles from './menu.module.css';

export type MenuCategory = { id: string; name: string };

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  priceMinor: number;
  available: boolean;
  type: CatalogItemType;
  durationMinutes: number | null;
};

/** Wording follows the vertical: a clinic has services, a shop has products. */
const NOUNS: Record<BusinessVertical, { singular: string; plural: string; type: CatalogItemType }> = {
  restaurant: { singular: 'menu item', plural: 'Menu items', type: 'menu_item' },
  clinic: { singular: 'service', plural: 'Services', type: 'service' },
  real_estate: { singular: 'listing', plural: 'Listings', type: 'product' },
  ecommerce: { singular: 'product', plural: 'Products', type: 'product' },
  other: { singular: 'item', plural: 'Items', type: 'service' },
};

export default function MenuManager({
  currency,
  vertical,
  categories,
  items,
}: {
  currency: string;
  vertical: BusinessVertical;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const nouns = NOUNS[vertical];
  const [itemState, submitItem] = useActionState(addItem, EMPTY_MENU_STATE);
  const [categoryState, submitCategory] = useActionState(addCategory, EMPTY_MENU_STATE);
  const [pending, startTransition] = useTransition();
  const [showItemForm, setShowItemForm] = useState(false);

  const grouped = [
    ...categories.map((category) => ({
      category,
      items: items.filter((item) => item.categoryId === category.id),
    })),
    { category: { id: '', name: 'Uncategorised' }, items: items.filter((i) => !i.categoryId) },
  ].filter((group) => group.items.length > 0 || group.category.id !== '');

  const unavailable = items.filter((i) => !i.available).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>{nouns.plural}</h2>
          <p className={styles.subtitle}>
            What your automations offer customers in chat. Marking something unavailable
            stops the bot offering it straight away.
            {unavailable > 0 && (
              <>
                {' '}
                <strong>
                  {unavailable} {unavailable === 1 ? 'item is' : 'items are'} currently
                  unavailable.
                </strong>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => setShowItemForm((v) => !v)}
        >
          <Plus size={15} />
          Add {nouns.singular}
        </button>
      </header>

      {showItemForm && (
        <form action={submitItem} className={styles.addForm}>
          {itemState.error && <p className={styles.error}>{itemState.error}</p>}

          <input type="hidden" name="type" value={nouns.type} />

          <div className={styles.addGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input name="name" className={styles.input} required placeholder="Beef Biryani" />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Price</span>
              <input
                name="price"
                className={styles.input}
                required
                inputMode="decimal"
                placeholder="750"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Category</span>
              <select name="categoryId" className={styles.input} defaultValue="">
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {nouns.type === 'service' && (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Duration (minutes)</span>
                <input
                  name="durationMinutes"
                  className={styles.input}
                  type="number"
                  min={0}
                  placeholder="30"
                />
              </label>
            )}
          </div>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Description</span>
            <input
              name="description"
              className={styles.input}
              placeholder="Shown under the name in chat"
            />
          </label>

          <SubmitButton label={`Add ${nouns.singular}`} />
        </form>
      )}

      {items.length === 0 && (
        <div className={styles.empty}>
          <UtensilsCrossed size={22} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Nothing here yet</p>
          <p className={styles.emptyBody}>
            Add your first {nouns.singular} and the ordering flow will start offering it.
          </p>
        </div>
      )}

      {grouped.map((group) => (
        <section key={group.category.id || 'uncategorised'} className={styles.group}>
          <div className={styles.groupHead}>
            <h3 className={styles.groupTitle}>{group.category.name}</h3>
            <span className={styles.groupCount}>
              {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
            </span>
            {group.category.id && group.items.length === 0 && (
              <button
                type="button"
                className={styles.iconBtn}
                title="Delete this category"
                onClick={() => startTransition(() => void removeCategory(group.category.id))}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <ul className={styles.itemList}>
            {group.items.map((item) => (
              <li
                key={item.id}
                className={`${styles.item} ${item.available ? '' : styles.itemOff}`}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.name}</span>
                  {item.description && (
                    <span className={styles.itemDescription}>{item.description}</span>
                  )}
                  {item.durationMinutes && (
                    <span className={styles.itemMeta}>{item.durationMinutes} min</span>
                  )}
                </div>

                <span className={styles.itemPrice}>
                  {formatMoney(item.priceMinor, currency)}
                </span>

                <button
                  type="button"
                  className={item.available ? styles.toggleOn : styles.toggleOff}
                  disabled={pending}
                  title={
                    item.available
                      ? 'Available — the bot is offering this'
                      : 'Unavailable — hidden from customers'
                  }
                  onClick={() =>
                    startTransition(() => void setItemAvailability(item.id, !item.available))
                  }
                >
                  {item.available ? 'Available' : 'Unavailable'}
                </button>

                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={pending}
                  title="Delete"
                  onClick={() => startTransition(() => void removeItem(item.id))}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form action={submitCategory} className={styles.categoryForm}>
        {categoryState.error && <p className={styles.error}>{categoryState.error}</p>}
        <input
          name="name"
          className={styles.input}
          placeholder="New category, e.g. Desserts"
          required
        />
        <SubmitButton label="Add category" subtle />
      </form>
    </div>
  );
}

function SubmitButton({ label, subtle }: { label: string; subtle?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={subtle ? styles.secondaryBtn : styles.primaryBtn}
      disabled={pending}
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}
