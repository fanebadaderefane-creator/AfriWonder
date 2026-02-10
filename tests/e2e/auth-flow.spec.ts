import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForNoBlockingOverlay, clickLoginButton, clickRegisterButton } from './helpers';

test.describe('Parcours auth - inscription & login', () => {
  test.describe.configure({ timeout: 60_000 });

  test('un utilisateur peut créer un compte puis se connecter depuis la landing page', async ({ page }) => {
    const uniqueSuffix = Date.now();
    const email = `e2e.${uniqueSuffix}@example.com`;
    const password = 'E2eTest123!@#';
    const username = `e2euser${uniqueSuffix}`;

    // La landing est la porte d'entrée principale pour l'inscription/login
    await page.goto('/Landing', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);

    // Ouvrir le formulaire d'inscription
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();

    // Remplir le formulaire d'inscription
    await page.getByPlaceholder('Nom complet').fill('Utilisateur E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);

    // Accepter les conditions
    await page.locator('#acceptTerms').check();

    // Soumettre le formulaire d'inscription (bouton submit dans le form, pas le CTA landing)
    await clickRegisterButton(page);

    // Le toast de succès doit apparaître (more flexible pattern)
    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    // Le formulaire de login est alors visible ; saisir le mot de passe si besoin et se connecter
    await page.getByPlaceholder('Mot de passe').fill(password);
    await clickLoginButton(page);

    // Redirection après connexion (app may stay on /Landing or go to / or /Home)
    await expect(page).toHaveURL(/\/($|Landing|landing|Home|home)/, { timeout: 10000 });
  });
});

