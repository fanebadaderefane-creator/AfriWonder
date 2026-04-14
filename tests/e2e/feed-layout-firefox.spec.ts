import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForAppVisible } from './helpers';

/** Même clé que `src/lib/guestExplore.js` — sans cela `/` sert la Landing, pas le feed. */
const GUEST_EXPLORE_KEY = 'afw_guest_explore';

/**
 * Garde-fou audit : colonne feed dimensionnée depuis le viewport (Firefox / WebView).
 * Ne valide pas le décodage vidéo — uniquement le layout pour éviter régression "carte trop étroite".
 */
test.describe('Feed layout (Firefox)', () => {
  test('colonne feed respecte minWidth ~ min(100vw, 400px)', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Garde-fou dimensionnel ciblé Firefox (audit WebView)');
    await page.addInitScript((key) => {
      sessionStorage.setItem(key, '1');
    }, GUEST_EXPLORE_KEY);
    await page.goto('/', { waitUntil: 'load', timeout: 25000 });
    await dismissCookieBanner(page);
    await waitForAppVisible(page, 15000);

    const column = page.locator('[data-afw-feed-column="1"]');
    await expect(column).toBeVisible({ timeout: 15000 });

    const box = await column.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    const vw = page.viewportSize()?.width ?? 1280;
    const expectedMin = Math.min(vw, 400);
    expect(box.width).toBeGreaterThanOrEqual(expectedMin - 2);
    expect(box.width).toBeLessThanOrEqual(402);
  });
});
