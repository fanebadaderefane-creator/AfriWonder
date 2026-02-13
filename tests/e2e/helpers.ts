import { Page } from '@playwright/test';

/**
 * Attend que le contenu React soit visible dans #root.
 * Utilise #root div (premier div descendant) au lieu de #root * pour éviter
 * de matcher une balise <script> injectée par Vite (hidden).
 */
export async function waitForAppVisible(page: Page, timeout = 25000): Promise<void> {
  await page.locator('#root div').first().waitFor({ state: 'visible', timeout });
}

/**
 * Wait for any full-screen overlay (modal backdrop, cookie banner container) to be hidden
 * so it doesn't intercept clicks (e.g. on "S'inscrire"). Call before critical clicks if needed.
 */
export async function waitForNoBlockingOverlay(page: Page): Promise<void> {
  const overlay = page.locator('.fixed.inset-0').first();
  try {
    await overlay.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // No overlay or already gone
  }
}

/**
 * Dismiss the cookie consent banner if visible (so it does not intercept clicks).
 * Call after navigating to a page that shows the banner (e.g. /Landing).
 * Banner appears after ~1s delay in the app.
 * Also waits for the overlay to be hidden so subsequent clicks are not blocked.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const acceptAll = page.getByRole('button', { name: /accepter tout/i });
  try {
    await acceptAll.waitFor({ state: 'visible', timeout: 5000 });
    await acceptAll.click();
    await waitForNoBlockingOverlay(page);
  } catch {
    // Banner may not be present (e.g. consent already given)
  }
}

/**
 * Click the primary login submit button (not the toggle buttons).
 * Use this to avoid strict mode violations when multiple "Se connecter" buttons exist.
 * Scopes to the form that contains the login submit button (works across WebKit/Chromium).
 */
export async function clickLoginButton(page: Page): Promise<void> {
  // On some flows, the registration form remains open. Switch to login form first.
  const loginHeading = page.getByRole('heading', { name: /se connecter/i });
  if (!(await loginHeading.isVisible({ timeout: 2000 }).catch(() => false))) {
    const switchToLogin = page
      .getByRole('button', { name: /déjà un compte\s*\?\s*se connecter|se connecter/i })
      .last();
    if (await switchToLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchToLogin.click();
    }
  }

  // Wait for login form to be visible before submitting.
  await loginHeading.waitFor({ state: 'visible', timeout: 10000 });

  // Click the submit button inside the login form (avoid strict mode violations).
  const loginForm = page.locator('form').filter({
    has: page.locator('button[type="submit"]').filter({ hasText: /se connecter|connexion/i }),
  });
  await loginForm.locator('button[type="submit"]').click();
}

/**
 * Click the primary register submit button (not the toggle buttons).
 * Use this to avoid ambiguous button selectors.
 */
export async function clickRegisterButton(page: Page): Promise<void> {
  // Click the submit button inside the register form
  await page.locator('form button[type="submit"]').filter({ hasText: /s'inscrire/i }).click();
}
