import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.warn('[SENTRY] DSN non configuré - monitoring désactivé');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Surveillance des erreurs (déjà actif par défaut)
    // Logs structurés envoyés à Sentry
    enableLogs: true,
    // Tracing : 100% en dev, 10% en prod (quota)
    tracesSampleRate: isProd ? 0.1 : 1.0,
    // Profiling : lié au cycle de vie des traces
    profileSessionSampleRate: isProd ? 0.1 : 1.0,
    profileLifecycle: 'trace',
    // Données PII (IP, etc.) — désactiver si conformité RGPD stricte
    sendDefaultPii: true,
    beforeSend(event, hint) {
      // Filtrer erreurs 4xx (erreurs utilisateur)
      if (event.exception) {
        const error = hint.originalException;
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return null;
          }
        }
      }
      return event;
    },
  });

  console.log('[SENTRY] Monitoring activé');
};

export const captureError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};
