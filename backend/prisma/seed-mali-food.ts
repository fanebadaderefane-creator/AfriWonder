import type { PrismaClient } from '@prisma/client';

/** Bannières / logos démo (Unsplash, HTTPS) — visuels « vraie nourriture » pour liste + fiche. */
export const FOOD_MEDIA_BY_CUISINE: Record<string, { banner: string; logo: string }> = {
  malienne: {
    banner:
      'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=1400&q=85',
    logo: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=400&q=80',
  },
  africaine: {
    banner:
      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1400&q=85',
    logo: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=80',
  },
  'fast-food': {
    banner:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1400&q=85',
    logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
  },
  traditionnelle: {
    banner:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1400&q=85',
    logo: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  },
  poissons: {
    banner:
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1400&q=85',
    logo: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
  },
};

type SeedMenuDish = { name: string; price: number; category: string; image: string; description?: string };

const MENU_BY_CUISINE: Record<string, SeedMenuDish[]> = {
  malienne: [
    {
      name: 'Riz gras & poulet braisé',
      price: 3_500,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80',
      description: 'Riz parfumé, poulet, légumes de saison.',
    },
    {
      name: 'Tô sauce arachide',
      price: 2_000,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Brochettes mouton & attiéké',
      price: 4_200,
      category: 'grillades',
      image:
        'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Jus bissap maison',
      price: 800,
      category: 'boissons',
      image:
        'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80',
    },
  ],
  africaine: [
    {
      name: 'Yassa poulet',
      price: 3_800,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Mafé bœuf',
      price: 4_000,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Alloco & poisson frit',
      price: 2_500,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Ginger juice',
      price: 900,
      category: 'boissons',
      image:
        'https://images.unsplash.com/photo-1621263764928-df1444c5e622?auto=format&fit=crop&w=800&q=80',
    },
  ],
  'fast-food': [
    {
      name: 'Burger maison & frites',
      price: 4_500,
      category: 'burgers',
      image:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Panini poulet',
      price: 3_000,
      category: 'sandwichs',
      image:
        'https://images.unsplash.com/photo-1528735602780-2552fdd44b4a?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Nuggets x6',
      price: 2_800,
      category: 'accompagnements',
      image:
        'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Milkshake vanille',
      price: 1_800,
      category: 'desserts',
      image:
        'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    },
  ],
  traditionnelle: [
    {
      name: 'Soupe kanté & gombo',
      price: 2_200,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Ragout igname & viande',
      price: 3_200,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Poulet DG',
      price: 5_500,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Salade fraîche',
      price: 1_500,
      category: 'entrées',
      image:
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    },
  ],
  poissons: [
    {
      name: 'Poisson braisé & alloco',
      price: 5_000,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Crevettes grillées',
      price: 6_500,
      category: 'plats',
      image:
        'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Riz blanc',
      price: 800,
      category: 'accompagnements',
      image:
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Sauce claire aux légumes',
      price: 1_200,
      category: 'accompagnements',
      image:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    },
  ],
};

function firstCuisineKey(raw: unknown): string {
  if (Array.isArray(raw) && raw.length > 0) {
    return String(raw[0]).toLowerCase().trim();
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().toLowerCase();
  }
  return 'malienne';
}

/**
 * Remplit bannières / logos manquants et menus vides pour les restaurants seedés
 * (idempotent — relancer après déploiement).
 */
export async function ensureRestaurantMenusAndBanners(prisma: PrismaClient): Promise<void> {
  const list = await prisma.restaurant.findMany({
    where: { is_verified: true },
    select: { id: true, name: true, cuisine_type: true, banner_url: true, logo_url: true },
  });

  let mediaUpdated = 0;
  let menusAdded = 0;

  for (const rest of list) {
    const key = firstCuisineKey(rest.cuisine_type);
    const media = FOOD_MEDIA_BY_CUISINE[key] ?? FOOD_MEDIA_BY_CUISINE.malienne;

    if (!rest.banner_url || !rest.logo_url) {
      await prisma.restaurant.update({
        where: { id: rest.id },
        data: {
          banner_url: rest.banner_url ?? media.banner,
          logo_url: rest.logo_url ?? media.logo,
        },
      });
      mediaUpdated++;
    }

    const existingItems = await prisma.menuItem.count({ where: { restaurant_id: rest.id } });
    if (existingItems > 0) continue;

    const dishes = MENU_BY_CUISINE[key] ?? MENU_BY_CUISINE.malienne;
    for (const d of dishes) {
      await prisma.menuItem.create({
        data: {
          restaurant_id: rest.id,
          restaurant_name: rest.name,
          name: d.name,
          description: d.description ?? undefined,
          category: d.category,
          price: d.price,
          image_url: d.image,
          is_available: true,
        },
      });
      menusAdded++;
    }
  }

  console.log(
    `Restauration démo : ${mediaUpdated} restaurant(s) mis à jour (visuels), ${menusAdded} plat(s) ajouté(s).`,
  );
}
