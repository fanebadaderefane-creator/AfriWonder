import { test, expect } from '@playwright/test';

/**
 * Matrice flows critiques — généré par autoFixSystem().
 * Activer : E2E_CRITICAL_BASE_URL=http://127.0.0.1:8081
 * TODO(AFW-e2e): OAuth Google/Facebook/Apple, OTP téléphone, appels, stories, checkout.
 */
test('critical: health / accueil', async ({ page }) => {
  const base = process.env.E2E_CRITICAL_BASE_URL;
  test.skip(!base, 'E2E_CRITICAL_BASE_URL manquant');
  await page.goto(base!);
  await expect(page.locator('body')).toBeVisible();
});

test('critical: login email / téléphone / OAuth', async () => {
  test.skip(true, 'TODO(AFW-e2e)');
});

test('critical: chat texte + audio + fichiers + image + vidéo', async () => {
  test.skip(true, 'TODO(AFW-e2e)');
});

test('critical: appel audio + vidéo', async () => {
  test.skip(true, 'TODO(AFW-e2e)');
});

test('critical: story + paiement + marketplace + upload média + profil', async () => {
  test.skip(true, 'TODO(AFW-e2e)');
});
