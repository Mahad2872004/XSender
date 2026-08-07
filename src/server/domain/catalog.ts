import type { CatalogCategory, CatalogItem, CatalogItemType } from '@/lib/database.types';
import type { WorkspaceContext } from '@/server/db/tenancy';

/**
 * The menu, product list, or service list.
 *
 * One table serves all three: a restaurant's menu items, a store's products,
 * and a clinic's bookable services differ in labelling and in whether they
 * carry a duration, not in structure.
 */

export interface CategoryWithItems {
  category: CatalogCategory;
  items: CatalogItem[];
}

/**
 * Everything a flow needs to show a customer, in one round trip.
 *
 * Only available items, only active categories — a sold-out dish must not be
 * offered by the bot.
 */
export async function loadMenu(
  ctx: WorkspaceContext,
  options: { includeUnavailable?: boolean } = {}
): Promise<CategoryWithItems[]> {
  const [categoriesResult, itemsResult] = await Promise.all([
    ctx
      .table('catalog_categories')
      .select()
      .order('sort_order', { ascending: true })
      .limit(100),
    ctx.table('catalog_items').select().order('sort_order', { ascending: true }).limit(500),
  ]);

  const categories = (categoriesResult.data ?? []).filter(
    (c) => options.includeUnavailable || c.active
  );
  const items = (itemsResult.data ?? []).filter(
    (i) => options.includeUnavailable || i.available
  );

  const grouped = categories.map((category) => ({
    category,
    items: items.filter((item) => item.category_id === category.id),
  }));

  // Items with no category still need somewhere to live, or they silently
  // vanish from the bot's menu.
  const orphans = items.filter((item) => !item.category_id);
  if (orphans.length > 0) {
    grouped.push({
      category: {
        id: 'uncategorised',
        workspace_id: ctx.workspaceId,
        name: 'Other',
        description: null,
        sort_order: 999,
        active: true,
        created_at: '',
        updated_at: '',
      },
      items: orphans,
    });
  }

  return grouped.filter((group) => group.items.length > 0);
}

export async function listCategories(ctx: WorkspaceContext): Promise<CatalogCategory[]> {
  const { data } = await ctx
    .table('catalog_categories')
    .select()
    .order('sort_order', { ascending: true })
    .limit(100);
  return data ?? [];
}

export async function listItems(ctx: WorkspaceContext): Promise<CatalogItem[]> {
  const { data } = await ctx
    .table('catalog_items')
    .select()
    .order('sort_order', { ascending: true })
    .limit(500);
  return data ?? [];
}

export async function createCategory(
  ctx: WorkspaceContext,
  input: { name: string; description?: string; sortOrder?: number }
): Promise<CatalogCategory> {
  ctx.requireRole('admin');

  const { data, error } = await ctx
    .table('catalog_categories')
    .insert({
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Could not create category: ${error?.message}`);
  return data;
}

export async function createItem(
  ctx: WorkspaceContext,
  input: {
    name: string;
    categoryId?: string | null;
    type?: CatalogItemType;
    description?: string;
    priceMinor: number;
    durationMinutes?: number | null;
    photoUrl?: string | null;
    sortOrder?: number;
  }
): Promise<CatalogItem> {
  ctx.requireRole('admin');

  const { data, error } = await ctx
    .table('catalog_items')
    .insert({
      name: input.name,
      category_id: input.categoryId ?? null,
      type: input.type ?? 'menu_item',
      description: input.description ?? null,
      price_minor: input.priceMinor,
      currency: ctx.workspace.currency,
      duration_minutes: input.durationMinutes ?? null,
      photo_url: input.photoUrl ?? null,
      sort_order: input.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error || !data) throw new Error(`Could not create item: ${error?.message}`);
  return data;
}

export async function updateItem(
  ctx: WorkspaceContext,
  itemId: string,
  patch: Partial<{
    name: string;
    description: string | null;
    price_minor: number;
    available: boolean;
    category_id: string | null;
    duration_minutes: number | null;
    photo_url: string | null;
    sort_order: number;
  }>
): Promise<void> {
  ctx.requireRole('admin');

  const { error } = await ctx.table('catalog_items').update(patch).eq('id', itemId);
  if (error) throw new Error(`Could not update item: ${error.message}`);
}

export async function deleteItem(ctx: WorkspaceContext, itemId: string): Promise<void> {
  ctx.requireRole('admin');

  // order_items.catalog_item_id is ON DELETE SET NULL and carries a name and
  // price snapshot, so past orders keep reading correctly.
  const { error } = await ctx.table('catalog_items').delete().eq('id', itemId);
  if (error) throw new Error(`Could not delete item: ${error.message}`);
}

export async function deleteCategory(ctx: WorkspaceContext, categoryId: string): Promise<void> {
  ctx.requireRole('admin');

  const { error } = await ctx.table('catalog_categories').delete().eq('id', categoryId);
  if (error) throw new Error(`Could not delete category: ${error.message}`);
}
