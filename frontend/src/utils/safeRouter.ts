import { router, type Href } from 'expo-router';
import { captureSentryException } from '../lib/sentryMobile';
import { devLog } from './devLog';

const FALLBACK_ROUTE: Href = '/(tabs)';

function sanitizeParams(params: Record<string, unknown> | undefined): Record<string, string> | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) out[k] = trimmed;
      continue;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = String(v);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeHref(href: unknown): Href | null {
  if (typeof href === 'string') {
    const path = href.trim();
    if (!path || !path.startsWith('/') || path.startsWith('//')) return null;
    return path as Href;
  }
  if (!href || typeof href !== 'object') return null;
  const obj = href as { pathname?: unknown; params?: Record<string, unknown> };
  const pathname = typeof obj.pathname === 'string' ? obj.pathname.trim() : '';
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) return null;
  const params = sanitizeParams(obj.params);
  return (params ? { pathname, params } : { pathname }) as Href;
}

function reportNavError(source: string, err: unknown, href?: unknown) {
  const error = err instanceof Error ? err : new Error(String(err ?? 'unknown navigation error'));
  captureSentryException(error, { source, href: String((href as { pathname?: string })?.pathname ?? href ?? '') });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    devLog(`[${source}]`, error.message);
  }
}

export function safeRouterPush(href: unknown, fallback: Href = FALLBACK_ROUTE): void {
  const normalized = normalizeHref(href);
  if (!normalized) {
    router.push(fallback);
    return;
  }
  try {
    router.push(normalized);
  } catch (err) {
    reportNavError('safeRouter.push', err, href);
    try {
      router.push(fallback);
    } catch {
      // no-op
    }
  }
}

/**
 * Retour arrière robuste : si la pile de navigation est vide (écran ouvert directement,
 * deep link, notification…), `router.back()` ne fait rien (« GO_BACK was not handled »).
 * On retombe alors sur une route par défaut pour que le bouton Retour marche toujours.
 */
export function safeRouterBack(fallback: Href = FALLBACK_ROUTE): void {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch (err) {
    reportNavError('safeRouter.back', err);
  }
  try {
    router.replace(fallback);
  } catch (err) {
    reportNavError('safeRouter.back.fallback', err, fallback);
  }
}

export function safeRouterReplace(href: unknown, fallback: Href = FALLBACK_ROUTE): void {
  const normalized = normalizeHref(href);
  if (!normalized) {
    router.replace(fallback);
    return;
  }
  try {
    router.replace(normalized);
  } catch (err) {
    reportNavError('safeRouter.replace', err, href);
    try {
      router.replace(fallback);
    } catch {
      // no-op
    }
  }
}

