/**
 * Smoke admin — identifiants via environnement ou
 *   tests/e2e/playwright-credentials.local (voir playwright-credentials.sample) :
 *   E2E_ADMIN_EMAIL
 *   E2E_ADMIN_PASSWORD
 *
 * Prérequis backend : le compte doit avoir un rôle autorisé (ex. super_admin)
 * et l’email doit correspondre à VITE_SUPER_ADMIN_EMAIL côté build (voir AdminDashboard.jsx).
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForNoBlockingOverlay } from './helpers';

const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();
const hasAdminCreds = Boolean(adminEmail && adminPassword);

test.describe('Personas — Admin (smoke login + tableau de bord)', () => {
  test.describe.configure({ timeout: 90_000 });

  test.skip(!hasAdminCreds, 'Définir E2E_ADMIN_EMAIL et E2E_ADMIN_PASSWORD.');

  test('viewport mobile — connexion puis Centre de Contrôle visible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/Landing#auth', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);

    await page.getByTestId('auth-mode-login').click();

    await page.getByTestId('login-email-input').fill(adminEmail!);
    await page.getByTestId('login-password-input').fill(adminPassword!);
    await page.getByTestId('submit-login').click();

    const feed = page.getByTestId('feed');
    await expect(feed).toBeVisible({ timeout: 25000 });

    await page.goto('/AdminDashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);

    await expect(page.getByRole('heading', { name: /Centre de Contrôle AfriWonder/i })).toBeVisible({
      timeout: 30000,
    });
  });
});
