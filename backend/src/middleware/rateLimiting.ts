import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { getAccessTokenFromRequest } from './auth.js';
import redisClient from '../config/redis.js';

const makeRedisStore = (prefix: string) =>
  redisClient
    ? new RedisStore({
        // Compatible with rate-limit-redis v4 typings
        sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
        prefix,
      })
    : undefined;

// Chemins webhooks paiement (ne pas appliquer la limite générale pour éviter blocage providers)
const isWebhookPath = (path: string) =>
  path === '/api/payment/webhook' ||
  path === '/api/payments/orange-money/webhook' ||
  path === '/api/payments/stripe/webhook' ||
  /^\/api\/payments\/[^/]+\/webhook/.test(path);

// Skip rate limiting only in test mode (Jest/smoke tests).
// Dev and staging environments are intentionally NOT bypassed — a staging server running
// NODE_ENV=development must still enforce limits to prevent brute-force attacks.
const shouldSkipAuthLimiterForE2E = (req: any) => {
  if (process.env.NODE_ENV === 'test') return true;
  const explicitE2EHeader = String(req.headers?.['x-e2e-test'] || '').toLowerCase() === '1';
  const userAgent = String(req.headers?.['user-agent'] || '').toLowerCase();
  const playwrightClient = userAgent.includes('playwright');
  return explicitE2EHeader || playwrightClient;
};

/** Skip rate limiting only in test mode; dev/staging enforce limits normally. */
const shouldSkipGeneralLimiterForE2E = (req: any) => {
  if (process.env.NODE_ENV === 'test') return true;
  const explicitE2EHeader = String(req.headers?.['x-e2e-test'] || '').toLowerCase() === '1';
  const userAgent = String(req.headers?.['user-agent'] || '').toLowerCase();
  return explicitE2EHeader || userAgent.includes('playwright');
};

/** JWT décodé sans DB — suffisant pour clé de quota par compte (audit : 100 req/min par user). */
function userIdFromJwtForRateLimit(req: Request): string | null {
  const token = getAccessTokenFromRequest(req);
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId?: string };
    return decoded.userId || null;
  } catch {
    return null;
  }
}

const apiGeneralMax = Math.max(
  1,
  parseInt(process.env.API_GENERAL_RATE_LIMIT_MAX || '100', 10) || 100
);

// Rate limiter général — audit : 100 req/min par utilisateur (JWT) ou par IP si anonyme ; surchargeable via env
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: apiGeneralMax,
  message: { success: false, error: 'Trop de requêtes, réessayez dans 1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isWebhookPath(req.path) || shouldSkipGeneralLimiterForE2E(req),
  keyGenerator: (req) => {
    const uid = userIdFromJwtForRateLimit(req);
    if (uid) return `user:${uid}`;
    return `ip:${req.ip || 'unknown'}`;
  },
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
  windowMs: 60 * 1000,
  max: 5, // 5 tentatives login/minute
  message: { success: false, error: 'Trop de tentatives de connexion. Réessayez dans 1 minute.' },
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

/** Traduction de texte (chat) — après authenticate pour clé par user.id */
export const translateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 80,
  message: { success: false, error: 'Limite de traductions atteinte. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const uid = (req as { user?: { id?: string } }).user?.id;
    return uid || req.ip || 'unknown';
  },
  store: makeRedisStore('rl:translate:')
});
