import { NextFunction, Request, Response } from 'express';

/**
 * Garde CSRF (cookie de session + Origin) pour le **navigateur**. Les apps Expo / RN parlent en **JWT**
 * (Bearer + JSON) : une fois le chemin identifié comme route **auth** ou avec **X-AFW-Device-Id**,
 * on évite les 403 « invalid origin » (cookies tiers, schémas exp://, passerelles).
 *
 * Toute nouvelle route publique sous un segment `…/auth/…` doit être couverte par `isAuthApiPath`
 * (sinon ajuster ce helper + test unitaire associé).
 */

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

export function isAuthApiPath(path: string): boolean {
  const p = normalizeRequestPath(path);
  if (!p || p === '/') return false;
  if (
    p.startsWith('/api/auth/') ||
    p === '/api/auth' ||
    p.startsWith('/api/proxy/auth/') ||
    p === '/api/proxy/auth' ||
    p.startsWith('/proxy/auth/') ||
    p === '/proxy/auth'
  ) {
    return true;
  }
  /**
   * Segment de chemin **exact** `auth` suivi de `/` ou fin (ex. `/api/v1/proxy/auth/register`,
   * `/api/proxy/auth/verify-email`). Ne matche pas `/api/authors` (pas de `/auth` + boundary).
   */
  return /(^|\/)auth(\/|$)/i.test(p);
}

/** Chemins à examiner (évite les faux positifs CSRF quand `req.path` vaut `/` derrière un proxy). */
function collectCsrfPathCandidates(req: Request): string[] {
  const seen = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v !== 'string' || !v.trim()) return;
    const s = v.trim();
    if (seen.has(s)) return;
    seen.add(s);
  };
  add(req.originalUrl);
  add(req.url);
  add(req.path);
  const base = typeof req.baseUrl === 'string' ? req.baseUrl : '';
  if (base && typeof req.path === 'string') {
    add(`${base.replace(/\/$/, '')}${req.path.startsWith('/') ? '' : '/'}${req.path}`);
  }
  return [...seen];
}

function isAuthApiRequest(req: Request): boolean {
  return collectCsrfPathCandidates(req).some((c) => isAuthApiPath(c));
}

/**
 * En-tête posé par les clients Expo / `apiClient` — absent des soumissions CSRF navigateur « simple ».
 * Réduit les blocages APK quand des cookies httpOnly sont renvoyés par OkHttp avec une Origin exotique.
 */
function hasTrustedMobileClientHint(req: Request): boolean {
  const raw = String(req.headers['x-afw-device-id'] || '').trim();
  return raw.length >= 8 && raw.length <= 128 && /^[a-zA-Z0-9._:-]+$/.test(raw);
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
    /** WebView / APK : schémas fréquents hors http(s). */
    if (lower.startsWith('android-app://')) return true;
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

/**
 * OkHttp / clients Android peuvent envoyer `Origin` ou `Referer` = l’URL publique de l’API
 * (ex. `https://afriwonder.onrender.com`) alors que `CORS_ORIGIN` ne liste que le domaine PWA.
 * Ce n’est pas un CSRF inter-navigateurs : même host que la requête → laisser passer.
 */
function originOrRefererMatchesRequestHost(req: Request, originHeader: string, refererHeader: string): boolean {
  const requestHost = String(
    (typeof req.get === 'function' ? req.get('host') : '') || (req.headers?.host as string | undefined) || '',
  )
    .trim()
    .toLowerCase();
  if (!requestHost) return false;

  for (const raw of [originHeader, refererHeader]) {
    const s = String(raw || '').trim();
    if (!s || s.toLowerCase() === 'null') continue;
    try {
      const url = new URL(s);
      if (!url.host) continue;
      if (url.host.toLowerCase() === requestHost) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\son\w+\s*=/gi, ' data-removed-event=');
}

/**
 * Clés dont la valeur doit rester **strictement identique** au corps reçu (auth, jetons).
 * `sanitizeString` neutralise motifs type ` onclick=` / `javascript:` — des mots de passe légitimes
 * peuvent les contenir → bcrypt échoue et l’utilisateur voit « Email ou mot de passe incorrect ».
 */
const BODY_KEYS_EXEMPT_FROM_HTML_SANITIZE = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'temporaryPassword',
  'refreshToken',
  'refresh_token',
  'token',
  'access_token',
  'accessToken',
  'id_token',
  'idToken',
  'identityToken',
  'identity_token',
  'backupCode',
  'twoFactorCode',
  'otpCode',
  'secret',
  'code',
]);

export function sanitizeDeep(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeDeep(entry));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (BODY_KEYS_EXEMPT_FROM_HTML_SANITIZE.has(k)) {
        out[k] = v;
        continue;
      }
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
  /**
   * Auth JWT (register, login, refresh, OAuth mobile, etc.) : pas de CSRF navigateur —
   * les clients utilisent JSON + tokens ; les cookies éventuels ne doivent pas bloquer l’API.
   */
  if (isAuthApiRequest(req)) {
    return next();
  }

  const authHeader = String(req.headers.authorization || '');
  const hasBearerToken = authHeader.startsWith('Bearer ');
  const hasCookie = typeof req.headers.cookie === 'string' && req.headers.cookie.length > 0;

  // Bearer/JWT API clients are not using cookie auth, skip CSRF guard.
  if (hasBearerToken || !hasCookie) {
    return next();
  }

  if (hasTrustedMobileClientHint(req)) {
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

  if (originOrRefererMatchesRequestHost(req, origin, referer)) {
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

