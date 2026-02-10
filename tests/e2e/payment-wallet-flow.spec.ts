import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers';

test.describe('Parcours paiement - portefeuille', () => {
  test('un utilisateur peut accéder à Mon Portefeuille après inscription backend', async ({ page, request }) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const email = `wallet.e2e.${uniqueSuffix}@example.com`;
    const password = 'E2eWallet123!@#';
    const username = `walletUser${uniqueSuffix}`;

    const apiBase =
      process.env.PLAYWRIGHT_API_URL ||
      process.env.VITE_API_URL ||
      'http://localhost:3000/api';

    // Créer un utilisateur directement via l'API backend (plus rapide/robuste pour ce flux)
    const registerResponse = await request.post(`${apiBase}/auth/register`, {
      headers: { 'x-e2e-test': '1' },
      data: {
        email,
        password,
        username,
        full_name: 'E2E Wallet User',
      },
    });

    if (!registerResponse.ok()) {
      const body = await registerResponse.text();
      throw new Error(`Register failed ${registerResponse.status()}: ${body}`);
    }
    const body = await registerResponse.json();
    const accessToken = body?.data?.accessToken;
    const refreshToken = body?.data?.refreshToken;

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Injecter les tokens dans le localStorage AVANT le chargement de l'app
    await page.context().addInitScript(
      ([access, refresh]) => {
        window.localStorage.setItem('access_token', access as string);
        window.localStorage.setItem('refresh_token', refresh as string);
      },
      [accessToken, refreshToken]
    );

    // Accéder directement à la page portefeuille
    await page.goto('/Wallet', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await dismissCookieBanner(page);

    // Attendre que le contenu du portefeuille soit affiché (API + rendu)
    await expect(
      page.getByRole('heading', { name: /mon portefeuille/i })
    ).toBeVisible({ timeout: 25000 });

    // Le solde disponible doit être affiché (même s'il est à 0)
    await expect(
      page.getByText(/Solde disponible/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

