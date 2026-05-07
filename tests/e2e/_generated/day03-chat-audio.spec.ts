import { test, expect } from '@playwright/test';

/**
 * Jour 3 - Chat audio
 * Template exécutable dès que les credentials et fixtures device sont branchés.
 */
test('J3 chat audio (template executable)', async ({ page }) => {
  const base = process.env.E2E_CRITICAL_BASE_URL;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  test.skip(!base || !email || !password, 'Configurer E2E_CRITICAL_BASE_URL + E2E_USER_EMAIL + E2E_USER_PASSWORD');

  await page.goto(`${base}/Inbox`);
  await expect(page.locator('body')).toBeVisible();
  // TODO(AFW-J3): login + ouverture conversation + enregistrement/envoi vocal + assertion lecture.
  test.fail(true, 'TODO(AFW-J3) - flow UI chat audio à finaliser');
});
