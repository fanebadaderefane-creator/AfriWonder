import { describe, expect, it } from 'vitest';
import { COMMERCE_AND_SERVICES_SHORTCUTS, filterCommerceShortcuts } from './commerceShortcuts';

describe('filterCommerceShortcuts', () => {
  it('returns full list when marketplace and news are enabled', () => {
    const out = filterCommerceShortcuts({ marketplace: true, news: true });
    expect(out).toEqual(COMMERCE_AND_SERVICES_SHORTCUTS);
  });

  it('removes marketplace when flag off', () => {
    const out = filterCommerceShortcuts({ marketplace: false, news: true });
    expect(out.some((s) => s.id === 'market')).toBe(false);
    expect(out.some((s) => s.id === 'transport')).toBe(true);
  });

  it('removes news when flag off', () => {
    const out = filterCommerceShortcuts({ marketplace: true, news: false });
    expect(out.some((s) => s.id === 'news')).toBe(false);
    expect(out.some((s) => s.id === 'menuplus')).toBe(true);
  });
});
