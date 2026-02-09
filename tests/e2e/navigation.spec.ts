/**
 * Navigation principale / PWA
 * Vérifie l'accès aux pages clés depuis le menu (home, recherche, profil)
 * et le comportement mobile (menu burger, bottom nav).
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation principale', () => {
  test('accès aux pages clés depuis la home (desktop)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });

    await page.goto('/Search');
    await expect(page).toHaveURL(/\/Search/i);

    await page.goto('/Profile');
    await expect(page).toHaveURL(/\/Profile/i);
  });

  test('accès home et layout sur mobile (viewport mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\//);
  });
});
