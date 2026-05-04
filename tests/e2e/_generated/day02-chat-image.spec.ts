import { test, expect } from '@playwright/test';

/**
 * Jour 2 - Chat image
 * Exécution réelle dès que la fixture image et les credentials E2E sont fournis.
 */
test('J2 chat image (template executable)', async ({ page }) => {
  const base = process.env.E2E_CRITICAL_BASE_URL;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!base || !email || !password, 'Configurer E2E_CRITICAL_BASE_URL + E2E_USER_EMAIL + E2E_USER_PASSWORD');

  await page.goto(`${base}/Inbox`);
  await expect(page.locator('body')).toBeVisible();
  // TODO(AFW-J2): compléter login si nécessaire + sélection image + envoi + assertion image visible.
  test.fail(true, 'TODO(AFW-J2) - flow UI chat image à finaliser');
});
