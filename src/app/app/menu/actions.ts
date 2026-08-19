'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireWorkspace } from '@/server/auth/session';
import { parseMoney } from '@/lib/money';
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  updateItem,
} from '@/server/domain/catalog';
import type { MenuActionState } from './form-state';

const itemInput = z.object({
  name: z.string().trim().min(1, 'Give the item a name.'),
  categoryId: z.string().uuid().nullable(),
  price: z.string(),
  description: z.string().trim().max(500).optional(),
  type: z.enum(['menu_item', 'product', 'service']),
  durationMinutes: z.number().int().min(0).nullable(),
});

export async function addItem(
  _prev: MenuActionState,
  formData: FormData
): Promise<MenuActionState> {
  const ctx = await requireWorkspace();

  const durationRaw = String(formData.get('durationMinutes') ?? '').trim();
  const categoryRaw = String(formData.get('categoryId') ?? '');

  const parsed = itemInput.safeParse({
    name: formData.get('name'),
    categoryId: categoryRaw === '' ? null : categoryRaw,
    price: String(formData.get('price') ?? ''),
    description: String(formData.get('description') ?? ''),
    type: formData.get('type') ?? 'menu_item',
    durationMinutes: durationRaw === '' ? null : Number(durationRaw),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
  }

  const priceMinor = parseMoney(parsed.data.price, ctx.workspace.currency);
  if (priceMinor === null) {
    return { error: 'Enter a price, for example 750.' };
  }

  try {
    await createItem(ctx, {
      name: parsed.data.name,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      description: parsed.data.description || undefined,
      priceMinor,
      durationMinutes: parsed.data.durationMinutes,
    });
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Could not add that item.' };
  }

  revalidatePath('/app/menu');
  return { error: null };
}

export async function addCategory(
  _prev: MenuActionState,
  formData: FormData
): Promise<MenuActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Give the category a name.' };

  const ctx = await requireWorkspace();

  try {
    await createCategory(ctx, { name });
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : 'Could not add that category.' };
  }

  revalidatePath('/app/menu');
  return { error: null };
}

/** Toggling availability is the single most-used control on this screen. */
export async function setItemAvailability(itemId: string, available: boolean): Promise<void> {
  const ctx = await requireWorkspace();
  await updateItem(ctx, itemId, { available });
  revalidatePath('/app/menu');
}

export async function removeItem(itemId: string): Promise<void> {
  const ctx = await requireWorkspace();
  await deleteItem(ctx, itemId);
  revalidatePath('/app/menu');
}

export async function removeCategory(categoryId: string): Promise<void> {
  const ctx = await requireWorkspace();
  await deleteCategory(ctx, categoryId);
  revalidatePath('/app/menu');
}

export async function editItemPrice(itemId: string, price: string): Promise<void> {
  const ctx = await requireWorkspace();
  const priceMinor = parseMoney(price, ctx.workspace.currency);
  if (priceMinor === null) return;
  await updateItem(ctx, itemId, { price_minor: priceMinor });
  revalidatePath('/app/menu');
}
