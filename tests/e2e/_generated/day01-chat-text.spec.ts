import { test, expect } from '@playwright/test';

/**
 * Jour 1 - Chat texte
 * Exécution réelle dès que les credentials E2E sont fournis.
 */
test('J1 chat texte (template executable)', async ({ page }) => {
  const base = process.env.E2E_CRITICAL_BASE_URL;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!base || !email || !password, 'Configurer E2E_CRITICAL_BASE_URL + E2E_USER_EMAIL + E2E_USER_PASSWORD');

  await page.goto(`${base}/(auth)/login`);
  await expect(page.locator('body')).toBeVisible();
  // TODO(AFW-J1): compléter login + ouverture inbox + envoi texte + assertion message visible.
  test.fail(true, 'TODO(AFW-J1) - flow UI chat texte à finaliser');
});
