// AfriWonder full review PR - CodeRabbit
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from './utils/logger.js';
// Import middleware sécurité
import { 
  generalLimiter, 
  authLimiter, 
  paymentLimiter, 
  uploadLimiter,
  adminLimiter,
  webhookLimiter 
} from './middleware/rateLimiting.js';
import { antiBotMiddleware, antiSpamMiddleware } from './middleware/antiBot.js';
import { attachRequestId, httpMetricsMiddleware, apiRequestTimeoutMiddleware } from './middleware/observability.middleware.js';
import { applyPerformanceMiddleware } from './middleware/performanceMiddleware.js';
import { getPrometheusExposition } from './services/prometheusMetrics.service.js';
import {
  cachePolicyMiddleware,
  csrfProtectionMiddleware,
  sanitizeInputMiddleware,
} from './middleware/requestProtection.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import videoRoutes from './routes/videos.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import userRoutes from './routes/users.routes.js';
import productRoutes from './routes/products.routes.js';
import orderRoutes from './routes/orders.routes.js';
import cartRoutes from './routes/cart.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import savesRoutes from './routes/saves.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import platformRoutes from './routes/platform.routes.js';
import commissionsRoutes from './routes/commissions.routes.js';
import withdrawalsRoutes from './routes/withdrawals.routes.js';
import subscriptionsRoutes from './routes/subscriptions.routes.js';
import marketplaceSubscriptionRoutes from './routes/marketplaceSubscription.routes.js';
import microcreditRoutes from './routes/microcredit.routes.js';
import crowdfundingRoutes from './routes/crowdfunding.routes.js';
import groupBuyRoutes from './routes/groupBuy.routes.js';
import rideShareRoutes from './routes/rideShare.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import eventsRoutes from './routes/events.routes.js';
import challengesRoutes from './routes/challenges.routes.js';
import communitiesRoutes from './routes/communities.routes.js';
import civicRoutes from './routes/civic.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import giftsRoutes from './routes/gifts.routes.js';
import callsRoutes from './routes/calls.routes.js';
import certificatesRoutes from './routes/certificates.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import gamificationRoutes from './routes/gamification.routes.js';
import viewHistoryRoutes from './routes/viewHistory.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import proxyRoutes from './routes/proxy.routes.js';
import servicesRoutes from './routes/services.routes.js';
import shippingRoutes from './routes/shipping.routes.js';
import exchangeRatesRoutes from './routes/exchangeRates.routes.js';
import sellerReviewsRoutes from './routes/seller-reviews.routes.js';
import supportRoutes from './routes/support.routes.js';
import refundsRoutes from './routes/refunds.routes.js';
import returnsRoutes from './routes/returns.routes.js';
import addressesRoutes from './routes/addresses.routes.js';
import sellerProfileRoutes from './routes/sellerProfile.routes.js';
import verificationRoutes from './routes/verification.routes.js';
// Services Locaux
import providersRoutes from './routes/providers.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import serviceReviewsRoutes from './routes/service-reviews.routes.js';
import serviceDisputesRoutes from './routes/service-disputes.routes.js';
import servicePayoutsRoutes from './routes/service-payouts.routes.js';
// Module Orders Complet
import disputesRoutes from './routes/disputes.routes.js';
import shipmentsRoutes from './routes/shipments.routes.js';
import orderReviewsRoutes from './routes/order-reviews.routes.js';
// Live Streaming
import liveRoutes from './routes/live.routes.js';
// News / Média
import newsRoutes from './routes/news.routes.js';
import messageRoutes from './routes/messages.routes.js';
import translateRoutes from './routes/translate.routes.js';
import sellerRoutes from './routes/seller.routes.js';
// Legal & Privacy
import legalRoutes from './routes/legal.routes.js';
// Pages HTML publiques (Privacy, Terms, Account Deletion) — Play Store requis
import publicPagesRoutes from './routes/publicPages.routes.js';
// Tontines digitales — épargne rotative africaine
import tontinesRoutes from './routes/tontines.routes.js';
// Billets bus Mali + hôtels
import busRoutes from './routes/bus.routes.js';
import hotelsRoutes from './routes/hotels.routes.js';
// Vague 5-8 super-app
import liveCommerceRoutes from './routes/liveCommerce.routes.js';
import utilityBillsRoutes from './routes/utilityBills.routes.js';
import savingsRoutes from './routes/savings.routes.js';
import virtualCardsRoutes from './routes/virtualCards.routes.js';
// Admin super-app — KPIs + contrôles des modules ajoutés
import adminSuperAppRoutes from './routes/adminSuperApp.routes.js';
// Appels vidéo payants (User ↔ Star) — module ISOLÉ, ne dépend d'aucun autre module
import starsRoutes from './routes/stars.routes.js';
import starsAdminRoutes from './routes/starsAdmin.routes.js';
import privacyRoutes from './routes/privacy.routes.js';
// Super-app (Transport, Food, Utilities, Tickets, Health, Property, Insurance)
import ridesRoutes from './routes/rides.routes.js';
import driversRoutes from './routes/drivers.routes.js';
import restaurantsRoutes from './routes/restaurants.routes.js';
import foodOrdersRoutes from './routes/foodOrders.routes.js';
import airtimeRoutes from './routes/airtime.routes.js';
import billsRoutes from './routes/bills.routes.js';
import ticketsRoutes from './routes/tickets.routes.js';
import doctorsRoutes from './routes/doctors.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import pharmaciesRoutes from './routes/pharmacies.routes.js';
import propertiesRoutes from './routes/properties.routes.js';
import insuranceRoutes from './routes/insurance.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import playlistsRoutes from './routes/playlists.routes.js';
import musicRoutes from './routes/music.routes.js';
import storiesRoutes from './routes/stories.routes.js';
import e2eeRoutes from './routes/e2ee.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import adsRoutes from './routes/ads.routes.js';
import feedRoutes from './routes/feed.routes.js';
import postsRoutes from './routes/posts.routes.js';
import paymentRequestRoutes from './routes/paymentRequest.routes.js';
import businessPageRoutes from './routes/businessPage.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import filtersRoutes from './routes/filters.routes.js';
import stickersRoutes from './routes/stickers.routes.js';
import groupCallsRoutes from './routes/groupCalls.routes.js';
import meRoutes from './routes/me.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import creatorsRoutes from './routes/creators.routes.js';
import brandDealsRoutes from './routes/brandDeals.routes.js';
import creatorMarketplaceRoutes from './routes/creatorMarketplace.routes.js';
import publicServicesRoutes from './routes/publicServices.routes.js';
import creatorSupportRoutes from './routes/creatorSupport.routes.js';
import creatorSubscriptionRoutes from './routes/creatorSubscription.routes.js';
import sellerSubscriptionRoutes from './routes/sellerSubscription.routes.js';
import earlyAccessRoutes from './routes/earlyAccess.routes.js';
import platformDonationsRoutes from './routes/platformDonations.routes.js';
import platformFeedbackRoutes from './routes/platformFeedback.routes.js';
import creatorDashboardRoutes from './routes/creatorDashboard.routes.js';
import referralsRoutes from './routes/referrals.routes.js';
import viralBonusRoutes from './routes/viralBonus.routes.js';
// Mini-Apps
import miniAppsRoutes from './routes/miniApps.routes.js';
import developerRoutes from './routes/developer.routes.js';
import matchingRoutes from './routes/matching.routes.js';
import publicApiRoutes from './routes/publicApi.routes.js';
// AI Engine & Business Intelligence
import aiEngineRoutes from './routes/aiEngine.routes.js';
import businessIntelligenceRoutes from './routes/businessIntelligence.routes.js';
import travelRoutes from './routes/travel.routes.js';
import cloudRoutes from './routes/cloud.routes.js';
import mapPlacesRoutes from './routes/mapPlaces.routes.js';
import aiRoutes from './routes/ai.routes.js';
import searchRoutes from './routes/search.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';
import mobileRoutes from './routes/mobile.routes.js';
import coinsRoutes from './routes/coins.routes.js';
import walletRoutes from './routes/wallet.routes.js';
// Nouveaux modules super-app J1 : véhicule / garde d'enfants (CRUD minimal sur
// ServiceProvider + Property, extensibles au fur et à mesure que les données réelles arrivent).
import vehicleRentalRoutes from './routes/vehicle-rental.routes.js';
import childcareRoutes from './routes/child-care.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { getErrorsSummary } from './services/errorMonitoring.service.js';
import { getHttpMetricsSummary } from './services/httpMetrics.service.js';
import prisma from './config/database.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import * as Sentry from '@sentry/node';
import { sendExtendedApiHealth } from './utils/apiHealthHandler.js';

const app = express();
app.set('trust proxy', 1);
app.set('etag', 'strong');
// CORS — avec credentials, on doit renvoyer une origine explicite (jamais *)
// CORS_ORIGIN peut être une URL ou plusieurs séparées par des virgules
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /** Expo (Metro / dev server web) — origine navigateur ≠ API (:3000) */
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19000',
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:19000',
  'http://127.0.0.1:19006',
  'https://afri-wonder.vercel.app',
  'https://afriwonder.vercel.app',
  'https://afri-wonder.app',
  'https://www.afri-wonder.app',
  'https://afriwonder.com',
  'https://www.afriwonder.com',
];
const corsOriginsFromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s && s !== '*'); // * interdit avec credentials
const allowedOrigins = [...new Set([...corsOriginsFromEnv, ...defaultOrigins])];

// CORS_ALLOW_VERCEL_PREVIEW=true doit être explicitement activé (staging uniquement).
// En production, cette option DOIT être false : tout subdomain *.vercel.app aurait sinon
// accès complet à l'API avec credentials, permettant à afriwonder-fake.vercel.app d'attaquer.
const allowVercelPreview = process.env.CORS_ALLOW_VERCEL_PREVIEW === 'true' &&
  process.env.NODE_ENV !== 'production';

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    const isVercelPreview = allowVercelPreview && origin?.endsWith('.vercel.app');
    const isAllowed = !origin || allowedOrigins.includes(origin) || isVercelPreview;
    // Toujours renvoyer une chaîne explicite, jamais true (évite Access-Control-Allow-Origin: *)
    const value = isAllowed ? (origin || allowedOrigins[0] || defaultOrigins[0]) : false;
    cb(null, value);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'baggage',
    'sentry-trace',
    'X-Device-Id',
    /** Client Expo / PWA — alertes de connexion (`frontend/src/api/client.ts`) */
    'X-AFW-Device-Id',
    'X-Requested-With',
    'X-Webhook-Secret',
    'X-Payment-Webhook-Secret',
    'X-Cron-Secret',
    'X-Live-Cleanup-Secret',
  ],
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(attachRequestId);
app.use(httpMetricsMiddleware);
app.use(apiRequestTimeoutMiddleware); // 30s timeout API (hors upload/webhooks) — stabilité
applyPerformanceMiddleware(app);

// Commissions : chargement différé après $connect() (voir index.ts) pour éviter erreurs DB au boot

// Sentry (Express) — l'instrumentation HTTP/Tracing est configurée dans initSentry()

// Health check (AVANT anti-bot pour que curl/k8s/CI puissent appeler /health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

/** Uptime / load-balancers Vercel — même contrat que le brief (`GET /api/health`). */
app.get('/api/health', sendExtendedApiHealth);

/**
 * Durabilité ch.1 — surface API versionnée (extension progressive).
 * Découverte des entrées stables pour intégrations et monitoring.
 */
app.get('/api/v1', (_req, res) => {
  res.json({
    service: 'afriwonder-api',
    api_version: 1,
    health: '/api/v1/health',
    openapi: '/api-docs',
    feedback_post: '/api/v1/platform-feedback',
    note:
      'Clients historiques : /api, /api/proxy. Nouveaux contrats : chemins sous /api/v1/* lorsque documentés dans Swagger.',
  });
});

app.get('/api/v1/health', sendExtendedApiHealth);

// Prometheus metrics (CDC Observabilité) — format text/plain pour scraper
app.get('/metrics', async (req, res) => {
  const apiKey = req.headers['x-health-key'] || req.query.key;
  const expected = process.env.HEALTH_API_KEY;
  if (expected && apiKey !== expected) {
    return res.status(401).set('Content-Type', 'text/plain').send('# Unauthorized\n');
  }
  try {
    const body = await getPrometheusExposition();
    res.set('Content-Type', 'text/plain; charset=utf-8').send(body);
  } catch (err) {
    res.status(500).set('Content-Type', 'text/plain').send('# Error generating metrics\n');
  }
});
// Test Sentry backend (dev uniquement) — GET /test-sentry pour déclencher une erreur.
// SÉCURITÉ : désactivé en production pour éviter (a) polluer Sentry par un attaquant
// et (b) exposer un endpoint de diagnostic non authentifié.
if (process.env.NODE_ENV !== 'production') {
  app.get('/test-sentry', (req, res) => {
    const err = new Error('[AfriWonder] Test Sentry Backend - ' + new Date().toISOString())
    Sentry.captureException(err)
    res.json({ ok: true, message: 'Erreur envoyée à Sentry.' })
  })
}

app.get('/health/ready', async (req, res) => {
  try {
    const prisma = (await import('./config/database.js')).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'unavailable', db: 'error', error: process.env.NODE_ENV === 'development' ? err?.message : undefined });
  }
});

// Middleware sécurité HTTP (HSTS/CSP/X-Frame-Options) + CORP pour médias proxifiés
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' }, // X-Frame-Options: DENY
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);
// Compression HTTP adaptée aux réseaux lents (Mali) :
// - seuil bas pour JSON/API
// - éviter de compresser les flux déjà compressés (video/audio)
app.use(
  compression({
    level: 5,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      const contentType = String(res.getHeader('Content-Type') || '').toLowerCase();
      if (contentType.startsWith('video/') || contentType.startsWith('audio/')) return false;
      if (req.path.includes('/stream') || req.path.includes('/manifest')) return false;
      return compression.filter(req, res);
    },
  })
);
// Webhooks paiement exigent body brut pour vérification signature (avant express.json)
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/orange-money/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(sanitizeInputMiddleware);
app.use(csrfProtectionMiddleware);

// Anti-bot (bloquer bots malveillants)
app.use(antiBotMiddleware);

// Rate limiting PRODUCTION (multi-niveaux)
app.use('/api/', generalLimiter); // 100 req/min par user JWT ou par IP (webhooks exclus ; voir API_GENERAL_RATE_LIMIT_MAX)

app.use('/api/payment/webhook', webhookLimiter);
app.use('/api/payments/orange-money/webhook', webhookLimiter);
app.use('/api/payments/stripe/webhook', webhookLimiter);

// Rate limiting STRICT par route critique
app.use('/api/auth/login', authLimiter); // 5 req/15min
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/supabase', authLimiter);
// Même contrat que l’ancien proxy Python / client mobile : /api/proxy/auth/*
app.use('/api/proxy/auth/login', authLimiter);
app.use('/api/proxy/auth/register', authLimiter);
app.use('/api/proxy/auth/forgot-password', authLimiter);
app.use('/api/proxy/auth/supabase', authLimiter);
app.use('/api/auth/oauth', authLimiter);
app.use('/api/proxy/auth/oauth', authLimiter);
app.use('/api/payments', paymentLimiter); // 10 req/h
app.use('/api/upload', uploadLimiter); // 20 req/h
app.use('/api/proxy/upload', uploadLimiter); // même quota pour client Expo (baseURL /api/proxy)
app.use('/api/admin', adminLimiter); // 30 req/min

// Anti-spam sur routes sensibles
app.use('/api/comments', antiSpamMiddleware);
app.use('/api/messages', antiSpamMiddleware);
app.use('/api/news', antiSpamMiddleware);
app.use(cachePolicyMiddleware);

// Région CEDEAO (Mali, Sénégal, CI, Burkina) — pour déploiement multi-pays
app.get('/health/region', async (_req, res) => {
  try {
    const { getAppCountry, DEFAULT_CURRENCY, SUPPORTED_COUNTRIES, COUNTRY_NAMES } = await import('./config/region.js');
    const country = getAppCountry();
    res.json({
      status: 'ok',
      country,
      currency: DEFAULT_CURRENCY,
      supportedCountries: SUPPORTED_COUNTRIES,
      countryName: COUNTRY_NAMES[country] || country,
    });
  } catch {
    res.json({ status: 'ok', country: 'ML', currency: 'XOF', supportedCountries: ['ML', 'SN', 'CI', 'BF'] });
  }
});

// Monitoring erreurs (optionnel : protéger par HEALTH_API_KEY en prod)
app.get('/health/errors', (req, res) => {
  const apiKey = req.headers['x-health-key'] || req.query.key;
  const expected = process.env.HEALTH_API_KEY;
  if (expected && apiKey !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  res.json({ success: true, ...getErrorsSummary() });
});

app.get('/health/metrics', (req, res) => {
  const apiKey = req.headers['x-health-key'] || req.query.key;
  const expected = process.env.HEALTH_API_KEY;
  if (expected && apiKey !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  res.json({ success: true, data: getHttpMetricsSummary() });
});

// Swagger API Documentation (désactivé en tests pour éviter les handles persistants)
if (process.env.NODE_ENV !== 'test') {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AfriWonder API Documentation',
  }));
  console.log('Swagger UI disponible sur http://localhost:3000/api-docs');
}

// API Routes
app.use('/api/auth', authRoutes);
/** Alias mobile / Expo : même router que /api/auth (le routeur proxy Node ne gérait que /media). */
app.use('/api/proxy/auth', authRoutes);
app.use('/api/videos', videoRoutes);
/** Client Expo / `apiClient` (baseURL `…/api/proxy`) — alias des routes API réelles (hors /media CDN). */
app.use('/api/proxy/videos', videoRoutes);
app.use('/api/proxy/users', userRoutes);
app.use('/api/proxy/products', productRoutes);
app.use('/api/proxy/search', searchRoutes);
/** Feed « Pour toi » (même contrat que `/api/feed`) — client Expo `apiClient` (`GET …/api/proxy/feed`). */
app.use('/api/proxy/feed', feedRoutes);
/** Notifications — aligné PWA `/api/notifications` pour le client Expo (`apiClient`). */
app.use('/api/proxy/notifications', notificationsRoutes);
app.use('/api/proxy/subscriptions', subscriptionsRoutes);
app.use('/api/proxy/payments', paymentRoutes);
app.use('/api/proxy/messages', messageRoutes);
app.use('/api/proxy/crowdfunding', crowdfundingRoutes);
app.use('/api/proxy/live', liveRoutes);
/** E2EE — même router que `/api/e2ee` pour `apiClient` Expo (`POST /e2ee/devices/register`, etc.). */
app.use('/api/proxy/e2ee', e2eeRoutes);
app.use('/api/proxy/ads', adsRoutes);
app.use('/api/proxy/creator-dashboard', creatorDashboardRoutes);
app.use('/api/proxy/withdrawals', withdrawalsRoutes);
app.use('/api/proxy/coins', coinsRoutes);
app.use('/api/proxy/posts', postsRoutes);
app.use('/api/proxy/moderation', moderationRoutes);
/** Console admin — même router que `/api/admin` pour `apiClient` Expo (`baseURL …/api/proxy`). */
app.use('/api/proxy/admin', adminRoutes);
/** Super-app admin (KPIs, tontines, crowdfunding, …) — `apiClient` → `/api/proxy/admin/super-app/*`. */
app.use('/api/proxy/admin/super-app', adminSuperAppRoutes);
/** APIs spécifiques mobile — alias proxy pour le client Expo quand il utilise `apiClient`. */
app.use('/api/proxy/mobile', mobileRoutes);
/** Sauvegardes vidéo — client Expo (`apiClient` → `GET/POST …/api/proxy/saves`). */
app.use('/api/proxy/saves', savesRoutes);
/** Réactions / social sur commentaires — client Expo (`POST …/api/proxy/comments/:id/reaction`). */
app.use('/api/proxy/comments', commentsRoutes);
/** Challenges (payants + viral hashtag) — proxy Expo. */
app.use('/api/proxy/challenges', challengesRoutes);
/** Playlists — client Expo (`apiClient` → `GET/POST …/api/proxy/playlists`). */
app.use('/api/proxy/playlists', playlistsRoutes);
/** Mini-apps — même router que `/api/mini-apps` pour `apiClient` Expo. */
app.use('/api/proxy/mini-apps', miniAppsRoutes);
/** APIs "me" (profil connecté, suggestions, etc.) — alias proxy pour `apiClient` Expo. */
app.use('/api/proxy/me', meRoutes);
/** APIs "friends" (mutual, contacts, block/report, presence) — alias proxy pour `apiClient` Expo. */
app.use('/api/proxy/friends', friendsRoutes);
/** Même auth / refresh que `apiClient` (Expo web) — avant le catch-all `/api/proxy`. */
app.use('/api/proxy/upload', uploadRoutes);
/** Stories — client Expo (`apiClient` → `GET/POST …/api/proxy/stories`). */
app.use('/api/proxy/stories', storiesRoutes);
/** Panier marketplace — client Expo (`apiClient` → `GET/POST …/api/proxy/cart`). */
app.use('/api/proxy/cart', cartRoutes);
/** Favoris produits — client Expo (`apiClient` → `GET …/api/proxy/wishlist`). */
app.use('/api/proxy/wishlist', wishlistRoutes);
/** Pétitions civiques — client Expo (`apiClient` → `GET …/api/proxy/civic`). */
app.use('/api/proxy/civic', civicRoutes);
/** Formations — client Expo (`apiClient` → `GET …/api/proxy/courses`). */
app.use('/api/proxy/courses', coursesRoutes);
/** Actualités — client Expo (`apiClient` → `GET …/api/proxy/news`). */
app.use('/api/proxy/news', newsRoutes);
/** Communautés — client Expo (`apiClient` → `GET …/api/proxy/communities`). */
app.use('/api/proxy/communities', communitiesRoutes);
/** Appels WebRTC / TURN — client Expo (`GET …/api/proxy/calls/turn-credentials`). */
app.use('/api/proxy/calls', callsRoutes);
/** Commandes marketplace — client Expo (`GET/POST …/api/proxy/orders`). */
app.use('/api/proxy/orders', orderRoutes);
/** RGPD / 2FA / cookies — client Expo `apiClient` → `…/api/proxy/privacy/*` */
app.use('/api/proxy/privacy', privacyRoutes);
/** Alias mobile Expo pour les modules super-app et growth. Sans ces montages,
 *  les appels `apiClient.get('/events'|'/referrals'|'/jobs'|'/properties'|'/rides'|'/doctors')
 *  tombaient sur le catch-all `/api/proxy` qui ne sert que `/media` → 404 systématique. */
app.use('/api/proxy/events', eventsRoutes);
app.use('/api/proxy/referrals', referralsRoutes);
app.use('/api/proxy/jobs', jobsRoutes);
app.use('/api/proxy/properties', propertiesRoutes);
app.use('/api/proxy/rides', ridesRoutes);
app.use('/api/proxy/drivers', driversRoutes);
// Télémédecine : même flag que le montage principal (TELEMEDICINE_ENABLED en prod).
// La variable `telemedicineEnabled` réelle est définie plus bas pour le montage principal ;
// on recalcule ici pour garder les deux blocs indépendants et éviter un reorder du fichier.
const telemedicineProxyEnabled =
  process.env.NODE_ENV !== 'production' || process.env.TELEMEDICINE_ENABLED === 'true';
if (telemedicineProxyEnabled) {
  app.use('/api/proxy/doctors', doctorsRoutes);
  app.use('/api/proxy/appointments', appointmentsRoutes);
  app.use('/api/proxy/pharmacies', pharmaciesRoutes);
}
/** Retours utilisateurs (mobile `apiClient` → POST …/api/proxy/platform-feedback). Durabilité ch.10. */
app.use('/api/proxy/platform-feedback', platformFeedbackRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment', paymentRoutes); // Webhook unique: POST /api/payment/webhook
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/saves', savesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/early-access', earlyAccessRoutes);
app.use('/api/platform-donations', platformDonationsRoutes);
app.use('/api/platform-feedback', platformFeedbackRoutes);
/** Même contrat sous préfixe versionné (ch.1). */
app.use('/api/v1/platform-feedback', platformFeedbackRoutes);
app.use('/api/creator-dashboard', creatorDashboardRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/viral-bonuses', viralBonusRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/marketplace-subscription', marketplaceSubscriptionRoutes);
app.use('/api/microcredit', microcreditRoutes);
app.use('/api/crowdfunding', crowdfundingRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/mini-apps', miniAppsRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/public', publicApiRoutes);
app.use('/api/admin/ai-engine', aiEngineRoutes);
app.use('/api/admin/business-intelligence', businessIntelligenceRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/civic', civicRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/gifts', giftsRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/view-history', viewHistoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/services', servicesRoutes);
// Services Locaux
app.use('/api/providers', providersRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api', availabilityRoutes); // Routes avec préfixe /api/providers/:id/availability
app.use('/api', serviceReviewsRoutes); // Routes avec préfixe /api/services/:id/reviews
app.use('/api/service-disputes', serviceDisputesRoutes);
app.use('/api', servicePayoutsRoutes); // Routes avec préfixe /api/providers/:id/payouts
app.use('/api/shipping', shippingRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/order-reviews', orderReviewsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/seller-reviews', sellerReviewsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/refunds', refundsRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/seller-profile', sellerProfileRoutes);
app.use('/api/seller-subscription', sellerSubscriptionRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/tontines', tontinesRoutes);
app.use('/api/bus', busRoutes);
app.use('/api/hotels', hotelsRoutes);
app.use('/api/live-commerce', liveCommerceRoutes);
app.use('/api/utility-bills', utilityBillsRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/virtual-cards', virtualCardsRoutes);
app.use('/api/admin/super-app', adminSuperAppRoutes);
// Paid Video Calls (User ↔ Star) — routes publiques + admin séparées
app.use('/api/stars', starsRoutes);
app.use('/api/admin/stars', starsAdminRoutes);
/** Alias mobile / Expo (`apiClient` baseURL `…/api/proxy`). Même router que `/api/stars`. */
app.use('/api/proxy/stars', starsRoutes);
app.use('/api/proxy/admin/stars', starsAdminRoutes);
// Pages HTML publiques (hors /api) : /privacy, /terms, /account/delete, /
// Exigence Google Play Store : URLs publiques sans auth, servies en HTTPS.
app.use('/', publicPagesRoutes);
app.use('/api/privacy', privacyRoutes);
// Super-app
app.use('/api/rides', ridesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/food-orders', foodOrdersRoutes);
app.use('/api/airtime', airtimeRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/tickets', ticketsRoutes);
const telemedicineEnabled =
  process.env.NODE_ENV !== 'production' || process.env.TELEMEDICINE_ENABLED === 'true';
if (telemedicineEnabled) {
  app.use('/api/doctors', doctorsRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/pharmacies', pharmaciesRoutes);
} else {
  logger.warn('Module telemedecine desactive en production (TELEMEDICINE_ENABLED=false)');
}
app.use('/api/properties', propertiesRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/e2ee', e2eeRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/payment-request', paymentRequestRoutes);
app.use('/api/business-page', businessPageRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/stickers', stickersRoutes);
app.use('/api/group-calls', groupCallsRoutes);
app.use('/api/me', meRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/group-buys', groupBuyRoutes);
app.use('/api/ride-share', rideShareRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/creators', creatorsRoutes);
app.use('/api/brand-deals', brandDealsRoutes);
app.use('/api/creator-marketplace', creatorMarketplaceRoutes);
app.use('/api/public-services', publicServicesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/map-places', mapPlacesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/creator-support', creatorSupportRoutes);
app.use('/api/creator-subscription', creatorSubscriptionRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/proxy/wallet', walletRoutes);
app.use('/api/vehicle-rental', vehicleRentalRoutes);
app.use('/api/proxy/vehicle-rental', vehicleRentalRoutes);
app.use('/api/childcare', childcareRoutes);
app.use('/api/proxy/childcare', childcareRoutes);
// Alias proxy supplémentaires pour les modules super-app utilitaires
// (utilisés par les nouveaux écrans mobile airtime/bills/loyalty/brand-deals).
app.use('/api/proxy/airtime', airtimeRoutes);
app.use('/api/proxy/bills', billsRoutes);
app.use('/api/proxy/loyalty', loyaltyRoutes);
app.use('/api/proxy/brand-deals', brandDealsRoutes);
app.use('/api/proxy/tickets', ticketsRoutes);
app.use('/api/proxy/restaurants', restaurantsRoutes);
app.use('/api/proxy/food-orders', foodOrdersRoutes);

// Sentry error handler (avant notre errorHandler, désactivé en tests)
if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  Sentry.setupExpressErrorHandler(app);
}
// Error handler (must be last)
app.use(errorHandler);

export default app;
