import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForAppVisible } from './helpers';

test.describe('Home page smoke test', () => {
  test('loads the main PWA shell on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 25000 });

    // La page doit charger et répondre
    await expect(page).toHaveTitle(/AfriWonder/i);

    await dismissCookieBanner(page);
    await waitForAppVisible(page, 15000);
  });
});

