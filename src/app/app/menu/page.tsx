import { requireOnboarded } from '@/server/auth/session';
import { listCategories, listItems } from '@/server/domain/catalog';
import MenuManager from './MenuManager';

export const metadata = { title: 'Menu & Services · xSender' };

/**
 * The sellable list every commerce flow reads from.
 *
 * Distinct from Templates, which is WhatsApp message-template compliance —
 * the naming collision flagged in the frontend audit.
 */
export default async function MenuPage() {
  const ctx = await requireOnboarded();

  const [categories, items] = await Promise.all([listCategories(ctx), listItems(ctx)]);

  return (
    <MenuManager
      currency={ctx.workspace.currency}
      locale={ctx.workspace.locale}
      vertical={ctx.workspace.vertical}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        categoryId: item.category_id,
        priceMinor: item.price_minor,
        available: item.available,
        type: item.type,
        durationMinutes: item.duration_minutes,
      }))}
    />
  );
}
