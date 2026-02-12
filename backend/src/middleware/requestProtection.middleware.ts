import { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isWebhookPath(path: string): boolean {
  return (
    path === '/api/payment/webhook' ||
    path === '/api/payments/orange-money/webhook' ||
    path === '/api/payments/stripe/webhook' ||
    /^\/api\/payments\/[^/]+\/webhook/.test(path)
  );
}

function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\son\w+\s*=/gi, ' data-removed-event=');
}

function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDeep(entry));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v);
    }
    return out;
  }
  return value;
}

export const sanitizeInputMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.body || isWebhookPath(req.path)) return next();
  if (typeof req.body !== 'object') return next();
  req.body = sanitizeDeep(req.body);
  next();
};

export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'test' || SAFE_METHODS.has(req.method)) {
    return next();
  }
  if (isWebhookPath(req.path)) {
    return next();
  }

  const authHeader = String(req.headers.authorization || '');
  const hasBearerToken = authHeader.startsWith('Bearer ');
  const hasCookie = typeof req.headers.cookie === 'string' && req.headers.cookie.length > 0;

  // Bearer/JWT API clients are not using cookie auth, skip CSRF guard.
  if (hasBearerToken || !hasCookie) {
    return next();
  }

  const allowedOrigins = [process.env.CORS_ORIGIN, process.env.APP_URL].filter(
    (v): v is string => !!v
  );
  if (allowedOrigins.length === 0) {
    return next();
  }

  const origin = String(req.headers.origin || '');
  const referer = String(req.headers.referer || '');
  const allowed = allowedOrigins.some((base) => origin.startsWith(base) || referer.startsWith(base));

  if (!allowed) {
    return res.status(403).json({
      success: false,
      error: { message: 'CSRF protection: invalid origin' },
    });
  }

  next();
};

export const cachePolicyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!SAFE_METHODS.has(req.method)) return next();

  const path = req.path;
  if (
    path.startsWith('/api/auth') ||
    path.startsWith('/api/cart') ||
    path.startsWith('/api/orders') ||
    path.startsWith('/api/payments') ||
    path.startsWith('/api/payment')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return next();
  }

  if (
    path.startsWith('/api/products') ||
    path.startsWith('/api/shipping') ||
    path.startsWith('/api/exchange-rates')
  ) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    return next();
  }

  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  next();
};

