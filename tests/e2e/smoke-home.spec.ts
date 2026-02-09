import { test, expect } from '@playwright/test';

test.describe('Home page smoke test', () => {
  test('loads the main PWA shell on mobile', async ({ page }) => {
    await page.goto('/');

    // La page doit charger et répondre
    await expect(page).toHaveTitle(/AfriConnect/i);

    // Vérification très légère de la navigation principale (bottom-nav ou layout)
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});

