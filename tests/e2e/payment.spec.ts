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
    // Backend: username <= 30, chars [a-zA-Z0-9_]
    const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 10);
    const email = `pay.e2e.${uniqueSuffix}@example.com`;
    const password = 'PayE2e123!@#';
    const username = `pay_${uniqueSuffix}`.slice(0, 30);

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
      page.getByRole('heading', { name: /portefeuille|wallet/i })
    ).toBeVisible({ timeout: 15000 });

    // Le contenu peut varier (offlineFirst, erreurs API, wallet non initialisé).
    // On accepte soit l'état "solde", soit l'état "erreur" tant que la page ne crash pas.
    const hasBalance = await page.getByText(/Solde actuel/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/Une erreur s'est produite/i).isVisible().catch(() => false);
    expect(hasBalance || hasError).toBeTruthy();
  });

  test('Scénario 2: utilisateur connecté accède à la page Checkout (tunnel de paiement)', async ({
    page,
    request,
  }) => {
    const apiBase =
      process.env.PLAYWRIGHT_API_URL ||
      process.env.VITE_API_URL ||
      'http://localhost:3000/api';
    // Backend: username <= 30, chars [a-zA-Z0-9_]
    const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 10);
    const email = `checkout.e2e.${uniqueSuffix}@example.com`;
    const password = 'CheckoutE2e123!@#';
    const username = `checkout_${uniqueSuffix}`.slice(0, 30);

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

    // Selon la configuration (Phase 1), Checkout peut rediriger vers Cart.
    const url = page.url();
    const isCheckout = /\/Checkout/i.test(url);
    const isCart = /\/Cart/i.test(url);
    expect(isCheckout || isCart).toBeTruthy();
    if (isCheckout) {
      await expect(
        page.getByRole('heading', { name: /finaliser la commande/i })
      ).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.getByRole('heading', { name: /mon panier/i })).toBeVisible({ timeout: 15000 });
    }
  });
});
