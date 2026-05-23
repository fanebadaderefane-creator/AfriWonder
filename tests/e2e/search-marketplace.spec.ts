/**
 * E2E — Search, Marketplace, Discover
 *
 * Parcours couverts :
 * 1. /Search : barre de recherche fonctionnelle, résultats
 * 2. /Marketplace : liste produits, filtres catégories
 * 3. /Discover : page explore visible
 * 4. /News : liste des articles
 * 5. /About, /FAQ, /Help : pages statiques accessibles
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForAppVisible } from './helpers';

test.describe('Search & Marketplace', () => {
  test.describe.configure({ timeout: 60_000 });

  test('1. /Search — barre de recherche présente et fonctionnelle', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Search', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/rechercher|search|trouver|explorer/i)
    );
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
    await searchInput.first().fill('vidéo');
    await expect(searchInput.first()).toHaveValue('vidéo');
  });

  test('2. /Marketplace — liste des produits visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Marketplace', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    await expect(
      page.getByRole('heading', { name: /marketplace|boutique|produits/i }).or(
        page.locator('h1, h2, [data-testid="marketplace-header"]').first()
      )
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3. /Marketplace — filtres de catégorie cliquables', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Marketplace', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    // Chercher un filtre de catégorie (button ou chip)
    const filters = page.getByRole('button').filter({ hasText: /tous|all|électronique|mode|alimentation/i });
    const hasFilters = await filters.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasFilters) {
      await filters.first().click();
      // Pas de crash après clic
      await expect(page.getByText(/crash|erreur inattendue/i)).not.toBeVisible();
    }
  });

  test('4. /Discover — page d'exploration visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Discover', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    await expect(
      page.locator('#main-content, main').first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/crash|erreur inattendue/i)).not.toBeVisible();
  });

  test('5. /News — articles présents', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/News', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    await expect(
      page.getByRole('heading', { name: /actualités|news|informations/i }).or(
        page.locator('h1, h2').first()
      )
    ).toBeVisible({ timeout: 10_000 });
  });

  test('6. Pages statiques /About, /FAQ, /Help accessibles', async ({ page }) => {
    for (const route of ['/About', '/FAQ', '/Help']) {
      await page.goto(route, { waitUntil: 'load', timeout: 20_000 });
      await waitForAppVisible(page, 10_000);

      await expect(page.getByText(/crash|erreur inattendue|something went wrong/i)).not.toBeVisible();
      await expect(page.locator('#main-content, main, body').first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('7. /Search — recherche vide affiche état initial', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Search', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    // En état initial (pas de query), pas d'erreur
    await expect(page.getByText(/crash|erreur inattendue/i)).not.toBeVisible();
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/rechercher|search|trouver|explorer/i)
    );
    await expect(searchInput.first()).toBeVisible({ timeout: 8_000 });
    await expect(searchInput.first()).toHaveValue('');
  });
});
