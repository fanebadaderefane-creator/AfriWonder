/**
 * Smoke « personas » (cahier des charges) — sans identifiants en dur.
 *
 * Définir dans l’environnement (CI secrets / local) ou via
 *   tests/e2e/playwright-credentials.local (voir playwright-credentials.sample) :
 *   E2E_STAGING_EMAIL
 *   E2E_STAGING_PASSWORD
 *
 * Puis : npx playwright test tests/e2e/personas-smoke.spec.ts --project=chromium-mobile
 *
 * Sans ces variables, les tests sont ignorés (skip) pour ne pas bloquer la CI.
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForNoBlockingOverlay } from './helpers';

const stagingEmail = process.env.E2E_STAGING_EMAIL?.trim();
const stagingPassword = process.env.E2E_STAGING_PASSWORD?.trim();
const hasStagingCreds = Boolean(stagingEmail && stagingPassword);

test.describe('Personas — Mamadou (smoke login + feed)', () => {
  test.describe.configure({ timeout: 90_000 });

  test.skip(!hasStagingCreds, 'Définir E2E_STAGING_EMAIL et E2E_STAGING_PASSWORD (staging ou compte jetable).');

  test('viewport mobile — connexion puis zone feed visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/Landing#auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);

    await page.getByTestId('auth-mode-login').click();

    await page.getByTestId('login-email-input').fill(stagingEmail!);
    await page.getByTestId('login-password-input').fill(stagingPassword!);
    await page.getByTestId('submit-login').click();

    await expect(page).toHaveURL(/\/($|\?|Home|home|Landing|landing)/, { timeout: 25000 });

    const feed = page.getByTestId('feed');
    await expect(feed).toBeVisible({ timeout: 25000 });
  });
});
