import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import microcreditRoutes from './routes/microcredit.routes.js';
import crowdfundingRoutes from './routes/crowdfunding.routes.js';
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
import servicesRoutes from './routes/services.routes.js';
import shippingRoutes from './routes/shipping.routes.js';
import exchangeRatesRoutes from './routes/exchangeRates.routes.js';
import sellerReviewsRoutes from './routes/seller-reviews.routes.js';
import supportRoutes from './routes/support.routes.js';
import refundsRoutes from './routes/refunds.routes.js';
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
import storiesRoutes from './routes/stories.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { getErrorsSummary } from './services/errorMonitoring.service.js';
import prisma from './config/database.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import * as Sentry from '@sentry/node';

const app = express();

// Sentry (Express) — l’instrumentation HTTP/Tracing est configurée dans initSentry()

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
// Stripe webhook exige body brut pour vérification signature (avant express.json)
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Health check (liveness)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV || 'development' });
});

// Readiness (DB connectée) — pour Kubernetes / load balancers
app.get('/health/ready', async (req, res) => {
  try {
    const prisma = (await import('./config/database.js')).default;
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'unavailable', db: 'error', error: process.env.NODE_ENV === 'development' ? err?.message : undefined });
  }
});

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

// Swagger API Documentation (désactivé en tests pour éviter les handles persistants)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AfriWonder API Documentation',
  }));
  console.log('📚 Swagger UI disponible sur http://localhost:3000/api-docs');
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
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
app.use('/api/commissions', commissionsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/microcredit', microcreditRoutes);
app.use('/api/crowdfunding', crowdfundingRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/events', eventsRoutes);
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
app.use('/api/addresses', addressesRoutes);
app.use('/api/seller-profile', sellerProfileRoutes);
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
app.use('/api/stories', storiesRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Sentry error handler (avant notre errorHandler, désactivé en tests)
if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  Sentry.setupExpressErrorHandler(app);
}
// Error handler (must be last)
app.use(errorHandler);

export default app;

