// AfriWonder full review PR - CodeRabbit
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

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
import sellerRoutes from './routes/seller.routes.js';
// Legal & Privacy
import legalRoutes from './routes/legal.routes.js';
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
import loyaltyRoutes from './routes/loyalty.routes.js';
import creatorsRoutes from './routes/creators.routes.js';
import brandDealsRoutes from './routes/brandDeals.routes.js';
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

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { getErrorsSummary } from './services/errorMonitoring.service.js';
import { getHttpMetricsSummary } from './services/httpMetrics.service.js';
import prisma from './config/database.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import * as Sentry from '@sentry/node';

const app = express();
app.set('trust proxy', 1);
app.set('etag', 'strong');
// CORS — avec credentials, on doit renvoyer une origine explicite (jamais *)
// CORS_ORIGIN peut être une URL ou plusieurs séparées par des virgules
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://afri-wonder.vercel.app',
  'https://afriwonder.vercel.app',
  'https://afriwonder.com',
  'https://www.afriwonder.com',
];
const corsOriginsFromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s && s !== '*'); // * interdit avec credentials
const allowedOrigins = [...new Set([...corsOriginsFromEnv, ...defaultOrigins])];

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    const isVercelPreview = origin?.endsWith('.vercel.app');
    const isAllowed = !origin || allowedOrigins.includes(origin) || isVercelPreview;
    // Toujours renvoyer une chaîne explicite, jamais true (évite Access-Control-Allow-Origin: *)
    const value = isAllowed ? (origin || allowedOrigins[0] || defaultOrigins[0]) : false;
    cb(null, value);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'baggage', 'sentry-trace', 'X-Device-Id', 'X-Requested-With', 'X-Webhook-Secret', 'X-Payment-Webhook-Secret', 'X-Cron-Secret', 'X-Live-Cleanup-Secret'],
};
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

app.use(attachRequestId);
app.use(httpMetricsMiddleware);
app.use(apiRequestTimeoutMiddleware); // 30s timeout API (hors upload/webhooks) — stabilité

// Commissions : chargement différé après $connect() (voir index.ts) pour éviter erreurs DB au boot

// Sentry (Express) — l’instrumentation HTTP/Tracing est configurée dans initSentry()

// Health check (AVANT anti-bot pour que curl/k8s/CI puissent appeler /health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// Prometheus metrics (CDC Observabilité) — format text/plain pour scraper
app.get('/metrics', (req, res) => {
  const apiKey = req.headers['x-health-key'] || req.query.key;
  const expected = process.env.HEALTH_API_KEY;
  if (expected && apiKey !== expected) {
    return res.status(401).set('Content-Type', 'text/plain').send('# Unauthorized\n');
  }
  try {
    const body = getPrometheusExposition();
    res.set('Content-Type', 'text/plain; charset=utf-8').send(body);
  } catch (err) {
    res.status(500).set('Content-Type', 'text/plain').send('# Error generating metrics\n');
  }
});
// Test Sentry backend (dev) — GET /test-sentry pour déclencher une erreur
app.get('/test-sentry', (req, res) => {
  const err = new Error('[AfriWonder] Test Sentry Backend - ' + new Date().toISOString())
  Sentry.captureException(err)
  res.json({ ok: true, message: 'Erreur envoyée à Sentry. Vérifie https://fbf-global-el.sentry.io/issues/?project=4510885269209168' })
})

app.get('/health/ready', async (req, res) => {
  try {
    const prisma = (await import('./config/database.js')).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'unavailable', db: 'error', error: process.env.NODE_ENV === 'development' ? err?.message : undefined });
  }
});

// Middleware (CORP cross-origin pour permettre au front d’utiliser les réponses ex. proxy média)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Compression gzip pour réduire bande passante et latence (charges massives)
app.use(compression());
// Webhooks paiement exigent body brut pour vérification signature (avant express.json)
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/payments/orange-money/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(sanitizeInputMiddleware);
app.use(csrfProtectionMiddleware);

// Anti-bot (bloquer bots malveillants)
app.use(antiBotMiddleware);

// Rate limiting PRODUCTION (multi-niveaux)
app.use('/api/', generalLimiter); // 10 req/s par IP (webhooks exclus)

app.use('/api/payment/webhook', webhookLimiter);
app.use('/api/payments/orange-money/webhook', webhookLimiter);
app.use('/api/payments/stripe/webhook', webhookLimiter);

// Rate limiting STRICT par route critique
app.use('/api/auth/login', authLimiter); // 5 req/15min
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/payments', paymentLimiter); // 10 req/h
app.use('/api/upload', uploadLimiter); // 20 req/h
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
app.use('/api/videos', videoRoutes);
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
app.use('/api/seller', sellerRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/privacy', privacyRoutes);
// Super-app
app.use('/api/rides', ridesRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/restaurants', restaurantsRoutes);
app.use('/api/food-orders', foodOrdersRoutes);
app.use('/api/airtime', airtimeRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/pharmacies', pharmaciesRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/stories', storiesRoutes);
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
app.use('/api/group-buys', groupBuyRoutes);
app.use('/api/ride-share', rideShareRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/creators', creatorsRoutes);
app.use('/api/brand-deals', brandDealsRoutes);
app.use('/api/public-services', publicServicesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/map-places', mapPlacesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/creator-support', creatorSupportRoutes);
app.use('/api/creator-subscription', creatorSubscriptionRoutes);

// Sentry error handler (avant notre errorHandler, désactivé en tests)
if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  Sentry.setupExpressErrorHandler(app);
}
// Error handler (must be last)
app.use(errorHandler);

export default app;
