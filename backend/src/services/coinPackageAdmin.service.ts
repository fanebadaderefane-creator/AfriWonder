import prisma from '../config/database.js';

export async function adminListCoinPackages() {
  return prisma.coinPackage.findMany({
    orderBy: [{ sort_order: 'asc' }, { coins_amount: 'asc' }],
  });
}

export async function adminCreateCoinPackage(data: {
  slug: string;
  name: string;
  coins_amount: number;
  price_fcfa: number;
  price_usd?: number | null;
  bonus_coins?: number;
  is_popular?: boolean;
  sort_order?: number;
  is_active?: boolean;
}) {
  const slug = data.slug.trim().replace(/\s+/g, '-').toLowerCase();
  return prisma.coinPackage.create({
    data: {
      slug,
      name: data.name.trim(),
      coins_amount: Math.floor(data.coins_amount),
      price_fcfa: Math.floor(data.price_fcfa),
      price_usd: data.price_usd ?? null,
      bonus_coins: Math.floor(data.bonus_coins ?? 0),
      is_popular: data.is_popular ?? false,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    },
  });
}

export async function adminUpdateCoinPackage(
  id: string,
  data: Partial<{
    slug: string;
    name: string;
    coins_amount: number;
    price_fcfa: number;
    price_usd: number | null;
    bonus_coins: number;
    is_popular: boolean;
    sort_order: number;
    is_active: boolean;
  }>,
) {
  const patch: Record<string, unknown> = {};
  if (data.slug != null) patch.slug = data.slug.trim().replace(/\s+/g, '-').toLowerCase();
  if (data.name != null) patch.name = data.name.trim();
  if (data.coins_amount != null) patch.coins_amount = Math.floor(data.coins_amount);
  if (data.price_fcfa != null) patch.price_fcfa = Math.floor(data.price_fcfa);
  if (data.price_usd !== undefined) patch.price_usd = data.price_usd;
  if (data.bonus_coins != null) patch.bonus_coins = Math.floor(data.bonus_coins);
  if (data.is_popular != null) patch.is_popular = data.is_popular;
  if (data.sort_order != null) patch.sort_order = data.sort_order;
  if (data.is_active != null) patch.is_active = data.is_active;
  return prisma.coinPackage.update({ where: { id }, data: patch });
}
