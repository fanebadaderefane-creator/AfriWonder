/**
 * Hub Services (Expo web ou PWA) — nécessite un serveur déjà démarré.
 * CI : définir PLAYWRIGHT_SERVICES_BASE_URL (ex. http://127.0.0.1:8081) pour exécuter ce fichier.
 */
import { test, expect } from '@playwright/test';

const servicesBase = process.env.PLAYWRIGHT_SERVICES_BASE_URL?.trim();

test.describe('Hub Services', () => {
  test('libellés modules visibles', async ({ page }) => {
    test.skip(!servicesBase, 'Définir PLAYWRIGHT_SERVICES_BASE_URL (ex. http://127.0.0.1:8081) pour ce test');

    const origin = servicesBase!.replace(/\/+$/, '');
    await page.goto(`${origin}/services`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect(page.getByText('Services', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Restauration')).toBeVisible();
    await expect(page.getByText('Transport')).toBeVisible();
    await expect(page.getByText('Market')).toBeVisible();
  });
});
