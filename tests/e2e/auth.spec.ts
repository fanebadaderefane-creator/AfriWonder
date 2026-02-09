/**
 * Parcours critique : Inscription + login (mobile-first)
 * Scénario 1: inscription viewport mobile, redirection
 * Scénario 2: déconnexion puis login avec les mêmes identifiants
 * Scénario 3: gestion d'erreurs (mauvais mot de passe, email déjà utilisé)
 */
import { test, expect } from '@playwright/test';

test.describe('Auth - Inscription & Login', () => {
  const uniqueSuffix = Date.now();
  const email = `e2e.auth.${uniqueSuffix}@example.com`;
  const password = 'E2eAuth123!@#';
  const username = `e2euser${uniqueSuffix}`;

  test('Scénario 1: inscription nouvel utilisateur (viewport mobile) puis redirection', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/Landing');
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();

    await page.getByPlaceholder('Nom complet').fill('Utilisateur E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();

    await expect(page).toHaveURL(/\/($|Home|home)/, { timeout: 10000 });
  });

  test('Scénario 2: déconnexion puis login avec les identifiants créés', async ({
    page,
  }) => {
    await page.goto('/Landing');
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('User Login E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`login${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`login.${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    const loginEmail = `login.${uniqueSuffix}@example.com`;
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/($|Home|home)/, { timeout: 10000 });

    await page.goto('/Profile');
    await page.getByRole('button', { name: /déconnexion|se déconnecter|logout/i }).first().click();

    await expect(page).toHaveURL(/\/(Landing|landing|$)/, { timeout: 5000 });

    await page.getByPlaceholder('Email').fill(loginEmail);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/($|Home|home)/, { timeout: 10000 });
  });

  test('Scénario 3a: erreur - mauvais mot de passe', async ({ page }) => {
    await page.goto('/Landing');
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('Error User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`err${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`err${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Mot de passe').fill('WrongPassword123!');
    await page.getByRole('button', { name: /se connecter/i }).click();

    await expect(
      page.getByText(/incorrect|erreur|invalid|wrong/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('Scénario 3b: erreur - email déjà utilisé à l\'inscription', async ({
    page,
  }) => {
    await page.goto('/Landing');
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('First User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`first${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`dup${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.goto('/Landing');
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('Second User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`second${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`dup${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await page.getByRole('button', { name: /s'inscrire/i }).click();

    await expect(
      page.getByText(/déjà utilisé|already|exist|erreur/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
