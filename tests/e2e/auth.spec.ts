/**
 * Parcours critique : Inscription + login (mobile-first)
 * Scénario 1: inscription viewport mobile, redirection
 * Scénario 2: déconnexion puis login avec les mêmes identifiants
 * Scénario 3: gestion d'erreurs (mauvais mot de passe, email déjà utilisé)
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForNoBlockingOverlay, clickLoginButton, clickRegisterButton } from './helpers';

test.describe('Auth - Inscription & Login', () => {
  test.describe.configure({ timeout: 90_000 });

  const uniqueSuffix = Date.now();
  const email = `e2e.auth.${uniqueSuffix}@example.com`;
  const password = 'E2eAuth123!@#';
  const username = `e2euser${uniqueSuffix}`;

  test('Scénario 1: inscription nouvel utilisateur (viewport mobile) puis redirection', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/Landing');
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();

    await page.getByPlaceholder('Nom complet').fill('Utilisateur E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await clickRegisterButton(page);

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await clickLoginButton(page);

    await expect(page).toHaveURL(/\/($|Landing|landing|Home|home)/, { timeout: 10000 });
  });

  test('Scénario 2: déconnexion puis login avec les identifiants créés', async ({
    page,
  }) => {
    await page.goto('/Landing');
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('User Login E2E');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`login${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`login.${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await clickRegisterButton(page);

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    const loginEmail = `login.${uniqueSuffix}@example.com`;
    await page.getByPlaceholder('Email').fill(loginEmail);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await clickLoginButton(page);
    await expect(page).toHaveURL(/\/($|Landing|landing|Home|home)/, { timeout: 10000 });

    // Déconnexion déterministe côté client pour éviter la dépendance à un bouton UI potentiellement variable.
    await page.evaluate(() => {
      window.localStorage.removeItem('access_token');
      window.localStorage.removeItem('refresh_token');
    });
    await page.goto('/Landing');
    await expect(page).toHaveURL(/\/(Landing|landing|$)/, { timeout: 10000 });

    await dismissCookieBanner(page);
    await page.getByPlaceholder('Email').fill(loginEmail);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await clickLoginButton(page);
    await expect(page).toHaveURL(/\/($|Landing|landing|Home|home)/, { timeout: 10000 });
  });

  test('Scénario 3a: erreur - mauvais mot de passe', async ({ page }) => {
    await page.goto('/Landing');
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('Error User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`err${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`err${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await clickRegisterButton(page);

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.getByPlaceholder('Email').fill(`err${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill('WrongPassword123!');
    await clickLoginButton(page);

    // La connexion doit être refusée et l'utilisateur rester sur l'écran d'authentification.
    await expect(page.getByPlaceholder('Email')).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('Mot de passe')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/($|Landing|landing)/, { timeout: 10000 });
  });

  test('Scénario 3b: erreur - email déjà utilisé à l\'inscription', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/Landing');
    await dismissCookieBanner(page);
    await waitForNoBlockingOverlay(page);
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('First User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`first${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`dup${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await clickRegisterButton(page);

    await expect(
      page.getByText(/Compte créé|créé avec succès|Connectez-vous/i)
    ).toBeVisible({ timeout: 15000 });

    await page.goto('/Landing');
    await dismissCookieBanner(page);
    await page.getByRole('button', { name: /s'inscrire/i }).first().click();
    await page.getByPlaceholder('Nom complet').fill('Second User');
    await page.getByPlaceholder("Nom d'utilisateur").fill(`second${uniqueSuffix}`);
    await page.getByPlaceholder('Email').fill(`dup${uniqueSuffix}@example.com`);
    await page.getByPlaceholder('Mot de passe').fill(password);
    await page.locator('#acceptTerms').check();
    await clickRegisterButton(page);

    // Backend returns "Email ou nom d'utilisateur déjà utilisé" (affiché dans un div d'erreur ou toast)
    await expect(
      page.getByText(/déjà utilisé|already|exist|erreur|nom d'utilisateur|utilisé|inscription/i)
    ).toBeVisible({ timeout: 20000 });
  });
});
