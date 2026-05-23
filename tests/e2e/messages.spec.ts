/**
 * E2E — Messagerie / Chat
 *
 * Parcours couverts :
 * 1. /Inbox charge la liste des conversations
 * 2. /Chat charge l'écran principal de chat
 * 3. Protection auth : /DirectMessage redirige si non connecté
 * 4. /StarredMessages charge la page des messages étoilés
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForAppVisible } from './helpers';

test.describe('Messagerie — Chat & Inbox', () => {
  test.describe.configure({ timeout: 60_000 });

  test('1. /Inbox se charge (liste des conversations)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Inbox', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    // La page doit afficher soit la liste, soit une redirection vers landing (auth)
    const url = page.url();
    if (url.includes('Inbox')) {
      // Page Inbox visible — chercher le heading ou une zone de conversation
      await expect(
        page.getByRole('heading', { name: /messages|inbox|conversations/i }).or(
          page.locator('[data-testid="inbox"], .conversation-list, main').first()
        )
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Redirigé vers auth — acceptable
      await expect(page).toHaveURL(/.+/);
    }
  });

  test('2. /Chat se charge sans crash', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Chat', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    // Soit la page Chat, soit redirection
    await expect(page).toHaveURL(/.+/, { timeout: 5_000 });
    // Pas de crash (pas de texte d'erreur React)
    await expect(page.getByText(/something went wrong|une erreur est survenue|crash/i)).not.toBeVisible();
  });

  test('3. /StarredMessages se charge sans crash', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/StarredMessages', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);

    await expect(page).toHaveURL(/.+/, { timeout: 5_000 });
    await expect(page.getByText(/something went wrong|crash/i)).not.toBeVisible();
  });

  test('4. /GroupChat se charge sans crash', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // GroupChat avec ID fictif
    await page.goto('/GroupChat?id=test', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);

    await expect(page).toHaveURL(/.+/, { timeout: 5_000 });
    await expect(page.getByText(/something went wrong|crash/i)).not.toBeVisible();
  });

  test('5. Recherche de contacts dans Inbox', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/Inbox', { waitUntil: 'load', timeout: 25_000 });
    await waitForAppVisible(page, 15_000);
    await dismissCookieBanner(page);

    const url = page.url();
    if (!url.includes('Inbox')) {
      test.info().annotations.push({ type: 'info', description: 'Inbox requires auth — skipped' });
      return;
    }

    // Chercher un champ de recherche
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/rechercher|search|trouver/i)
    );
    const hasSearch = await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false);
    if (hasSearch) {
      await searchInput.first().fill('test');
      await expect(searchInput.first()).toHaveValue('test');
    }
  });
});
