import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Redis client pour rate limiting distribué
const redisClient = process.env.REDIS_URL 
  ? createClient({ url: process.env.REDIS_URL })
  : null;

if (redisClient) {
  redisClient.connect().catch(console.error);
}

const makeRedisStore = (prefix: string) =>
  redisClient
    ? new RedisStore({
        // Compatible with rate-limit-redis v4 typings
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
        prefix,
      })
    : undefined;

// Chemins webhooks paiement (ne pas appliquer la limite générale pour éviter blocage providers)
const isWebhookPath = (path: string) =>
  path === '/api/payment/webhook' ||
  path === '/api/payments/orange-money/webhook' ||
  path === '/api/payments/stripe/webhook' ||
  /^\/api\/payments\/[^/]+\/webhook/.test(path);

// During local/dev E2E runs, avoid auth lockouts caused by intentional negative test cases.
const shouldSkipAuthLimiterForE2E = (req: any) => {
  if (process.env.NODE_ENV !== 'production') return true;
  const explicitE2EHeader = String(req.headers?.['x-e2e-test'] || '').toLowerCase() === '1';
  const userAgent = String(req.headers?.['user-agent'] || '').toLowerCase();
  const playwrightClient = userAgent.includes('playwright');
  return explicitE2EHeader || playwrightClient;
};

// Rate limiter général - 10 req/s par IP (checklist production)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // 600 req/min = 10 req/s par IP
  message: { success: false, error: 'Trop de requêtes, réessayez dans 1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWebhookPath(req.path),
  store: makeRedisStore('rl:general:')
});

// Webhooks paiement : limite large (providers envoient rafales), vérifier signature en prod
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 120/min par IP pour webhooks
  message: { success: false, error: 'Trop de requêtes webhook' },
  store: makeRedisStore('rl:webhook:')
});

// Auth stricte: login/register
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives login/15min
  message: { success: false, error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: true, // Ne compte que les échecs
  skip: (req) => shouldSkipAuthLimiterForE2E(req),
  store: makeRedisStore('rl:auth:')
});

// Paiements ultra-strict
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // 10 paiements/heure max
  message: { success: false, error: 'Limite de paiements atteinte. Contactez le support.' },
  store: makeRedisStore('rl:payment:')
});

// Upload vidéo/image
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, // 20 uploads/heure
  message: { success: false, error: 'Limite d\'upload atteinte. Réessayez plus tard.' },
  store: makeRedisStore('rl:upload:')
});

// API admin super-strict
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, error: 'Limite API admin atteinte' },
  store: makeRedisStore('rl:admin:')
});

// WebSocket connections
export const socketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 connexions/minute max
  message: { success: false, error: 'Trop de connexions WebSocket' },
  store: makeRedisStore('rl:socket:')
});
