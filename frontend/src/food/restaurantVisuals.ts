/**
 * Affichage liste / fiche restaurant : libellé cuisine (Prisma JSON[]) et image
 * (URL absolue seedée ou photo « nourriture » de secours par type de cuisine).
 */

const CUISINE_FOOD_PHOTO: Record<string, string> = {
  malienne:
    'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=800&q=80',
  africaine:
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
  'fast-food':
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  fastfood:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  traditionnelle:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  poissons:
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
  default:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
};

/** Texte UI à partir du champ Prisma `cuisine_type` (tableau JSON, string, etc.). */
export function normalizeCuisineLabel(raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) {
    return raw.filter((x) => x != null && String(x).trim()).map(String).join(' · ');
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return '';
    try {
      const p = JSON.parse(t) as unknown;
      if (Array.isArray(p)) {
        return p.filter((x) => x != null && String(x).trim()).map(String).join(' · ');
      }
    } catch {
      /* chaîne simple */
    }
    return t;
  }
  return String(raw);
}

function cuisineKeyFromLabel(label: string): string {
  const s = label.toLowerCase();
  if (s.includes('fast') || s.includes('burger')) return 'fast-food';
  if (s.includes('poisson') || s.includes('fish')) return 'poissons';
  if (s.includes('tradition')) return 'traditionnelle';
  if (s.includes('afric')) return 'africaine';
  if (s.includes('malien')) return 'malienne';
  const first = normalizeCuisineLabel(label).split('·')[0]?.trim().toLowerCase() ?? '';
  return first || 'default';
}

/** URL affichable (https…) : priorité aux médias API, sinon photo Unsplash selon la cuisine. */
export function restaurantHeroImageUrl(r: {
  cover_image?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  cuisine_type?: unknown;
}): string {
  const direct = [r.cover_image, r.banner_url, r.logo_url].find((x) => typeof x === 'string' && x.trim());
  if (direct) return direct.trim();
  const label = normalizeCuisineLabel(r.cuisine_type);
  const key = cuisineKeyFromLabel(label);
  return CUISINE_FOOD_PHOTO[key] ?? CUISINE_FOOD_PHOTO.default;
}

/** Miniature plat sans `image_url` : rotation de photos Unsplash pour éviter l’icône vide. */
const MENU_THUMB_ROTATION = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=400&q=80',
];

export function menuItemFallbackImage(index: number): string {
  return MENU_THUMB_ROTATION[Math.abs(index) % MENU_THUMB_ROTATION.length];
}
