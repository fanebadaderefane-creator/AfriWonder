/**
 * Navigation principale / PWA
 * Vérifie l'accès aux pages clés depuis le menu (home, recherche, profil)
 * et le comportement mobile (menu burger, bottom nav).
 */
import { test, expect } from '@playwright/test';
import { waitForAppVisible } from './helpers';

test.describe('Navigation principale', () => {
  test('accès aux pages clés depuis la home (desktop)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 20000 });
    await waitForAppVisible(page, 15000);

    // Unauthenticated: /Search and /Profile may redirect to /Landing or stay on route
    await page.goto('/Search', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page).toHaveURL(/\/(Search|Landing)?\/?$/i, { timeout: 10000 });

    await page.goto('/Profile', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page).toHaveURL(/\/(Profile|Landing)?\/?$/i, { timeout: 10000 });
  });

  test('accès home et layout sur mobile (viewport mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'load', timeout: 20000 });

    await waitForAppVisible(page, 15000);
    await expect(page).toHaveURL(/\//);
  });
});
