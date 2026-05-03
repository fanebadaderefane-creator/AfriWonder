import { describe, expect, it } from 'vitest';
import { menuItemFallbackImage, normalizeCuisineLabel, restaurantHeroImageUrl } from './restaurantVisuals';

describe('restaurantVisuals', () => {
  it('normalizeCuisineLabel joint les tableaux', () => {
    expect(normalizeCuisineLabel(['malienne', 'grillades'])).toBe('malienne · grillades');
  });

  it('normalizeCuisineLabel parse une chaîne JSON tableau', () => {
    expect(normalizeCuisineLabel('["fast-food"]')).toBe('fast-food');
  });

  it('restaurantHeroImageUrl utilise une URL directe', () => {
    expect(
      restaurantHeroImageUrl({
        banner_url: 'https://example.com/a.jpg',
        cuisine_type: ['malienne'],
      }),
    ).toBe('https://example.com/a.jpg');
  });

  it('restaurantHeroImageUrl retourne une photo de secours https', () => {
    const u = restaurantHeroImageUrl({ cuisine_type: ['poissons'] });
    expect(u.startsWith('https://')).toBe(true);
    expect(u).toContain('unsplash.com');
  });

  it('menuItemFallbackImage est stable', () => {
    expect(menuItemFallbackImage(0)).toContain('unsplash.com');
    expect(menuItemFallbackImage(99)).toContain('unsplash.com');
  });
});
