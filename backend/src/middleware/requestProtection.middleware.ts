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

function normalizeRequestPath(path: string): string {
  if (!path || typeof path !== 'string') return '';
  let p = path.split('?')[0];
  if (p.includes('://')) {
    try {
      p = new URL(p).pathname;
    } catch {
      /* garde la chaîne brute si parsing impossible */
    }
  }
  return p.replace(/\/+$/, '') || '/';
}

function isAuthApiPath(path: string): boolean {
  const p = normalizeRequestPath(path);
  return (
    p.startsWith('/api/auth/') ||
    p === '/api/auth' ||
    p.startsWith('/api/proxy/auth/') ||
    p === '/api/proxy/auth'
  );
}

/**
 * APK / Expo / WebView : pas d’origine HTTP(S) “navigateur”, ou schémas natifs —
 * ce n’est pas le cas d’usage CSRF classique (onglet malveillant + cookies session).
 * En prod comme en dev : on laisse passer pour éviter de bloquer les comptes existants.
 */
function shouldBypassCsrfOriginCheck(originHeader: string, refererHeader: string): boolean {
  const o = String(originHeader || '').trim();
  const r = String(refererHeader || '').trim();
  if (!o && !r) return true;

  for (const raw of [o, r].filter(Boolean)) {
    const lower = raw.toLowerCase();
    if (lower === 'null') return true;
    if (
      lower.startsWith('capacitor://') ||
      lower.startsWith('ionic://') ||
      lower.startsWith('file://')
    ) {
      return true;
    }
    if (lower.startsWith('exp://') || lower.startsWith('exps://')) return true;
    if (lower.startsWith('react-native://')) return true;
  }
  return false;
}

/**
 * Expo Web / Metro (:8081, :8082, …) et tests locaux : navigateur envoie souvent une origine
 * `http://localhost:*` absente de `CORS_ORIGIN`, alors qu’un cookie de session tiers existe —
 * le garde CSRF bloque à tort (`invalid origin`). En prod on reste strict.
 */
function isLocalDevTrustedBrowserOrigin(originHeader: string, refererHeader: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const raw = (originHeader || refererHeader || '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      host.endsWith('.localhost')
    );
  } catch {
    return false;
  }
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
  // API token-based auth endpoints: ne pas appliquer de contrôle CSRF d'origine.
  // Ces routes n'utilisent pas de session cookie browser classique.
  if (isAuthApiPath(req.path) || isAuthApiPath(req.originalUrl || '')) {
    return next();
  }

  const authHeader = String(req.headers.authorization || '');
  const hasBearerToken = authHeader.startsWith('Bearer ');
  const hasCookie = typeof req.headers.cookie === 'string' && req.headers.cookie.length > 0;

  // Bearer/JWT API clients are not using cookie auth, skip CSRF guard.
  if (hasBearerToken || !hasCookie) {
    return next();
  }

  const corsOriginList = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== '*');
  const allowedOrigins = [...corsOriginList, process.env.APP_URL].filter(
    (v): v is string => !!v
  );
  if (allowedOrigins.length === 0) {
    return next();
  }

  const origin = String(req.headers.origin || '').trim();
  const referer = String(req.headers.referer || '').trim();

  if (shouldBypassCsrfOriginCheck(origin, referer)) {
    return next();
  }

  let allowed =
    allowedOrigins.some((base) => origin.startsWith(base) || referer.startsWith(base)) ||
    origin.endsWith('.vercel.app') ||
    (referer && referer.includes('.vercel.app')) ||
    origin.includes('afriwonder.com') ||
    (referer && referer.includes('afriwonder.com'));

  if (!allowed && isLocalDevTrustedBrowserOrigin(origin, referer)) {
    allowed = true;
  }

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

