import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers';

/**
 * Parcours critique paiement (plan stratégie tests) :
 * Utilisateur connecté, accès au portefeuille / tunnel de paiement.
 * En CI/dev sans Stripe réel : on vérifie l'accès aux pages et la création de session (mock ou test mode).
 */
test.describe('Parcours paiement / achat de contenu', () => {
  test('Scénario 1: utilisateur connecté accède au portefeuille (happy path)', async ({
    page,
    request,
  }) => {
    const apiBase =
      process.env.PLAYWRIGHT_API_URL ||
      process.env.VITE_API_URL ||
      'http://localhost:3000/api';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const email = `pay.e2e.${uniqueSuffix}@example.com`;
    const password = 'PayE2e123!@#';
    const username = `payuser${uniqueSuffix}`;

    const registerRes = await request.post(`${apiBase}/auth/register`, {
      headers: { 'x-e2e-test': '1' },
      data: { email, password, username, full_name: 'E2E Payment User' },
    });
    if (!registerRes.ok()) {
      const body = await registerRes.text();
      throw new Error(`Register failed ${registerRes.status()}: ${body}`);
    }
    const body = await registerRes.json();
    const accessToken = body?.data?.accessToken;
    const refreshToken = body?.data?.refreshToken;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    await page.context().addInitScript(
      ([access, refresh]) => {
        window.localStorage.setItem('access_token', access as string);
        window.localStorage.setItem('refresh_token', refresh as string);
      },
      [accessToken, refreshToken]
    );

    await page.goto('/Wallet');

    await expect(
      page.getByRole('heading', { name: /mon portefeuille|wallet/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText(/solde|balance|disponible/i)).toBeVisible({ timeout: 5000 });
  });

  test('Scénario 2: utilisateur connecté accède à la page Checkout (tunnel de paiement)', async ({
    page,
    request,
  }) => {
    const apiBase =
      process.env.PLAYWRIGHT_API_URL ||
      process.env.VITE_API_URL ||
      'http://localhost:3000/api';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const email = `checkout.e2e.${uniqueSuffix}@example.com`;
    const password = 'CheckoutE2e123!@#';
    const username = `checkoutuser${uniqueSuffix}`;

    const registerRes = await request.post(`${apiBase}/auth/register`, {
      headers: { 'x-e2e-test': '1' },
      data: { email, password, username, full_name: 'E2E Checkout User' },
    });
    if (!registerRes.ok()) {
      const body = await registerRes.text();
      throw new Error(`Register failed ${registerRes.status()}: ${body}`);
    }
    const body = await registerRes.json();
    const accessToken = body?.data?.accessToken;
    const refreshToken = body?.data?.refreshToken;
    expect(accessToken).toBeTruthy();

    await page.context().addInitScript(
      ([access, refresh]) => {
        window.localStorage.setItem('access_token', access as string);
        window.localStorage.setItem('refresh_token', refresh as string);
      },
      [accessToken, refreshToken]
    );

    await page.goto('/Checkout', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await dismissCookieBanner(page);

    await expect(page).toHaveURL(/\/Checkout/i);
    await expect(
      page.getByRole('heading', { name: /finaliser la commande/i })
    ).toBeVisible({ timeout: 15000 });
  });
});
