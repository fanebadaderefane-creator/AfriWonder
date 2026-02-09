import { test, expect } from '@playwright/test';

test.describe('Parcours auth - inscription & login', () => {
  test('un utilisateur peut créer un compte puis se connecter depuis la landing page', async ({ page }) => {
    const uniqueSuffix = Date.now();
    const email = `e2e.${uniqueSuffix}@example.com`;
    const password = 'E2eTest123!@#';
    const username = `e2euser${uniqueSuffix}`;

    // La landing est la porte d'entrée principale pour l'inscription/login
    await page.goto('/Landing');

    // Ouvrir le formulaire d'inscription
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();

    // Remplir le formulaire d'inscription
    await page.getByPlaceholder('Nom complet').fill('Utilisateur E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);

    // Accepter les conditions
    await page.locator('#acceptTerms').check();

    // Soumettre le formulaire d'inscription
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    // Le toast de succès doit apparaître
    await expect(
      page.getByText(/Compte créé\. Connectez-vous avec votre email et mot de passe\./i)
    ).toBeVisible();

    // Le formulaire de login est alors visible ; saisir le mot de passe si besoin et se connecter
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Redirection vers la home (/) après connexion
    await expect(page).toHaveURL(/\/$/);
  });
});

