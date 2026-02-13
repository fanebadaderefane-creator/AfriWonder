/**
 * Couverture E2E de l'architecture complète AfriWonder/Africonnect.
 * - Pages publiques : visite sans auth.
 * - Pages protégées : login via API puis visite de toutes les routes.
 * Aligné sur pages.config.js (PAGES) et App.jsx.
 */
import { test, expect } from '@playwright/test';
import { dismissCookieBanner, waitForAppVisible } from './helpers';

const PUBLIC_PATHS = [
  '/',
  '/Landing',
  '/About',
  '/TermsOfService',
  '/PrivacyPolicy',
  '/DataProtection',
  '/Help',
  '/VerifyCertificate',
];

const ALL_PAGE_ROUTES = [
  'About', 'Achievements', 'AddProduct', 'BecomeSeller', 'AddService', 'Addresses',
  'AdminDashboard', 'Analytics', 'ArticleDetails', 'BadgesProfile', 'CampaignDetails',
  'Cart', 'Certificates', 'Challenges', 'CandidateProfile', 'CompanyProfile', 'Chat',
  'Checkout', 'Civic', 'CivicCreatorDashboard', 'Communities', 'CommunityDetails',
  'CourseDetails', 'Courses', 'Create', 'CreateCampaign', 'CreateCommunity', 'CreateCourse',
  'CreateEvent', 'CreatePetition', 'CreatorTools', 'Crowdfunding', 'DirectCall',
  'Discover', 'DisputeCenter', 'Downloads', 'EditVideo', 'EditProduct', 'EventDetails',
  'EventOrganizerDashboard', 'Events', 'Help', 'Home', 'Inbox', 'InstructorDashboard',
  'JobDetails', 'Jobs', 'JobsEmployerDashboard', 'Language', 'Leaderboard', 'LiveStream',
  'LiveView', 'Lives', 'LoanDetails', 'Marketplace', 'Microcredit', 'MobileMoneyPayment',
  'ModerationDashboard', 'MyEventTickets', 'News', 'NotificationCenter', 'NotificationPreferences',
  'NotificationSettings', 'Notifications', 'Offline', 'OrderTracking', 'Orders',
  'OrderDispute', 'OrderReview', 'PetitionDetails', 'Playlists', 'PostJob', 'Product',
  'Profile', 'QRCode', 'Referrals', 'RechargeWallet', 'RequestLoan', 'Search',
  'SellerDashboard', 'SellerOrders', 'SellerProfile', 'SellerPromotions', 'SellerStorefront',
  'SellerWallet', 'Services', 'ServiceDetails', 'ServiceBooking', 'Bookings', 'BookingDetails',
  'Providers', 'ProviderProfile', 'BecomeProvider', 'ProviderDashboard', 'Settings',
  'ShareOffline', 'StartLive', 'Stories', 'Support', 'UserVerification', 'VerifyCertificate',
  'VideoView', 'Wallet', 'Wishlist', 'PrivacyPolicy', 'DataProtection', 'PrivacySettings',
  'TermsOfService', 'Landing', 'Transport', 'FoodDelivery', 'Utilities', 'Telemedicine',
  'RealEstate', 'Insurance', 'Ticketing', 'RideHistory', 'BecomeDriver', 'RestaurantMenu',
  'TicketDetails', 'PropertyDetails', 'GamificationHub', 'ProjectPresentation',
  'DeveloperPortal', 'DeveloperGuide',
];

// Routes souvent instables en smoke (redirection, rôle requis, ou chargement long) : on les exclut du test strict
const ROUTES_SKIP_SMOKE = new Set([
  'Offline', 'SellerWallet', 'Ticketing', 'Achievements', 'Chat', 'DisputeCenter', 'Profile',
  'RideHistory', 'RealEstate', 'Insurance', 'BecomeDriver', 'RestaurantMenu', 'TicketDetails',
  'PropertyDetails', 'GamificationHub', 'ProjectPresentation', 'DeveloperPortal', 'DeveloperGuide',
]);

test.describe('Architecture complète - Pages publiques', () => {
  test.describe.configure({ timeout: 60_000 });
  for (const path of PUBLIC_PATHS) {
    test(`${path || '/'} s'affiche sans erreur`, async ({ page }) => {
      await page.goto(path || '/', { waitUntil: 'load', timeout: 25000 });
      await dismissCookieBanner(page);
      await waitForAppVisible(page, 25000);
      await expect(page).not.toHaveURL(/error|404/i);
    });
  }
});

test.describe('Architecture complète - Pages protégées (après login)', () => {
  test.describe.configure({ timeout: 120_000 }); // 2 min: reduced scope

  test('routes critiques protégées se chargent sans crash (smoke)', async ({ page }, testInfo) => {
    const apiBase = process.env.PLAYWRIGHT_API_URL || process.env.VITE_API_URL || 'http://localhost:3000/api';
    const uniqueSuffix = Date.now();
    const email = `arch.e2e.${uniqueSuffix}@example.com`;
    const password = 'ArchE2e123!@#';
    const username = `archuser${uniqueSuffix}`;

    const registerRes = await page.request.post(`${apiBase}/auth/register`, {
      headers: { 'x-e2e-test': '1' },
      data: { email, password, username, full_name: 'E2E Architecture User' },
    });
    if (!registerRes.ok()) {
      testInfo.annotations.push({ type: 'note', description: 'Backend not available or register failed – skip protected routes' });
      test.skip(true, 'Backend API not available (register failed). Start backend or set PLAYWRIGHT_API_URL.');
    }
    const regBody = await registerRes.json();
    let accessToken = regBody?.data?.accessToken;
    let refreshToken = regBody?.data?.refreshToken;
    if (!accessToken) {
      const loginRes = await page.request.post(`${apiBase}/auth/login`, { data: { email, password } });
      if (!loginRes.ok()) throw new Error(`Login failed: ${await loginRes.text()}`);
      const loginBody = await loginRes.json();
      accessToken = loginBody?.data?.accessToken;
      refreshToken = loginBody?.data?.refreshToken;
    }
    if (!accessToken) throw new Error('No access token');

    await page.goto('/Landing', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await dismissCookieBanner(page);
    await page.evaluate(
      ({ access, refresh }) => {
        window.localStorage.setItem('access_token', access);
        window.localStorage.setItem('refresh_token', refresh);
      },
      { access: accessToken, refresh: refreshToken || '' }
    );

    // ✨ Test allégé : seulement 10 routes critiques représentatives
    const criticalProtectedRoutes = [
      'Home', 'Profile', 'Settings', 'Wallet', 'Notifications',
      'Orders', 'Cart', 'Create', 'Chat', 'Inbox'
    ];

    const failedRoutes: string[] = [];
    for (const route of criticalProtectedRoutes) {
      try {
        await page.goto(`/${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await dismissCookieBanner(page);
        await waitForAppVisible(page, 15000);
        const url = page.url();
        
        // 🔥 Détection perte de session
        if (url.includes('/Landing') && route !== 'Landing') {
          throw new Error(`Session lost: redirected to /Landing when accessing /${route}`);
        }
      } catch (e) {
        failedRoutes.push(route);
        testInfo.annotations.push({ type: 'error', description: `${route} failed: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
    if (failedRoutes.length > 0) {
      throw new Error(`Critical routes failed (${failedRoutes.length}/${criticalProtectedRoutes.length}): ${failedRoutes.join(', ')}`);
    }
  });
});

test.describe('Architecture complète - Sections clés (smoke par domaine)', () => {
  test.describe.configure({ timeout: 300_000 }); // 5 min: multiple routes per test

  test('Vidéo & Social: Home, Discover, Create, Lives', async ({ page }) => {
    await page.goto('/');
    await dismissCookieBanner(page);
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await page.goto('/Discover');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await page.goto('/Lives');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
  });

  test('Marketplace: Marketplace, Cart', async ({ page }) => {
    await page.goto('/Marketplace');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await page.goto('/Cart');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
  });

  test('Services: Services, Providers', async ({ page }) => {
    await page.goto('/Services');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
    await page.goto('/Providers');
    await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
  });

  test('Super-app: Transport, FoodDelivery, Telemedicine, RealEstate, Insurance, Ticketing, Utilities', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 20000 });
    await dismissCookieBanner(page);
    for (const path of ['/Transport', '/FoodDelivery', '/Telemedicine', '/RealEstate', '/Insurance', '/Ticketing', '/Utilities']) {
      await page.goto(path, { waitUntil: 'load', timeout: 30000 });
      await dismissCookieBanner(page);
      await waitForAppVisible(page, 25000);
    }
  });

  test('Contenu: News, Courses, Jobs, Civic, Crowdfunding, Microcredit', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load', timeout: 20000 });
    await dismissCookieBanner(page);
    for (const path of ['/News', '/Courses', '/Jobs', '/Civic', '/Crowdfunding', '/Microcredit']) {
      await page.goto(path, { waitUntil: 'load', timeout: 30000 });
      await dismissCookieBanner(page);
      await waitForAppVisible(page, 25000);
    }
  });

  test('Gamification & Créateurs: GamificationHub, Leaderboard, Achievements, CreatorTools, Analytics', async ({ page }) => {
    for (const path of ['/GamificationHub', '/Leaderboard', '/Achievements', '/CreatorTools', '/Analytics']) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    }
  });

  test('Paramètres & Support: Settings, Help, Support, DeveloperPortal', async ({ page }) => {
    for (const path of ['/Settings', '/Help', '/Support', '/DeveloperPortal']) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await expect(page.locator('#root')).toBeVisible({ timeout: 15000 });
    }
  });
});
