import * as Sentry from '@sentry/react-native';

let initialized = false;

/**
 * Sentry natif : uniquement si `EXPO_PUBLIC_SENTRY_DSN` est défini.
 * En développement, rien n’est envoyé sauf si `EXPO_PUBLIC_SENTRY_DEBUG=1`
 * (évite le bruit et les quotas pendant Metro).
 */
export function initMobileSentry(): void {
  if (initialized) return;
  const dsn = typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() : '';
  if (!dsn) return;

  const debug = process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1';
  if (typeof __DEV__ !== 'undefined' && __DEV__ && !debug) return;

  initialized = true;
  try {
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      environment: process.env.EXPO_PUBLIC_APP_ENV || (typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production'),
      tracesSampleRate: 0.15,
      enableAutoSessionTracking: true,
      debug: Boolean(debug && typeof __DEV__ !== 'undefined' && __DEV__),
    });
  } catch {
    initialized = false;
  }
}

export function captureSentryMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' = 'error',
  extra?: Record<string, unknown>
): void {
  if (!initialized) return;
  try {
    Sentry.captureMessage(message, { level, extra });
  } catch {
    /* ignore */
  }
}
