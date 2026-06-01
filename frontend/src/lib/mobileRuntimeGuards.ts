import { Platform } from 'react-native';
import { captureSentryException, isMobileSentryInitialized } from './sentryMobile';
import { devLog } from '../utils/devLog';

let runtimeGuardsInstalled = false;

/**
 * Réduit les fermetures « silencieuses » côté JS : journalise et remonte les erreurs vers Sentry
 * tout en conservant le comportement natif (redbox dev / arrêt fatal prod défini par RN).
 *
 * Les crashs **100 % natifs** (mémoire, bug module natif) ne passent pas ici — d’où Sentry + tests sur appareils réels.
 */
export function installMobileRuntimeGuards(): void {
  if (runtimeGuardsInstalled) return;
  runtimeGuardsInstalled = true;

  if (Platform.OS === 'web') return;
  const sentryReady = isMobileSentryInitialized();

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- API non exportée en ESM typé
    const RN = require('react-native') as {
      ErrorUtils?: {
        getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
        setGlobalHandler?: (callback: (error: Error, isFatal?: boolean) => void) => void;
      };
    };
    const EU = RN.ErrorUtils;
    if (!EU?.setGlobalHandler || typeof EU.getGlobalHandler !== 'function') return;

    const previous = EU.getGlobalHandler();
    EU.setGlobalHandler((error: Error, isFatal?: boolean) => {
      const fatal = Boolean(isFatal);
      try {
        captureSentryException(error, {
          isFatal: fatal,
          source: 'ErrorUtils.globalHandler',
          sentryReady,
        });
      } catch {
        /* */
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        devLog('[GlobalHandler]', fatal ? 'fatal' : 'non-fatal', error?.message);
      }
      /**
       * En production mobile, un fatal JS déclenche souvent la fermeture immédiate de l'app
       * (symptôme perçu "l'app se ferme quand je navigue"). On journalise dans Sentry puis
       * on évite de relayer au handler natif fatal pour limiter ces fermetures brutales.
       * Les crashs 100% natifs restent gérés par Android/iOS.
       */
      if (fatal && (typeof __DEV__ === 'undefined' || !__DEV__)) {
        return;
      }
      if (typeof previous === 'function') {
        previous(error, fatal);
      }
    });
  } catch {
    /* WebView / tests hors RN : ignorer */
  }

  /** Certains runtimes exposent `onunhandledrejection` : best-effort pour les promesses rejetées non gérées. */
  try {
    const g = globalThis as { onunhandledrejection?: ((event: unknown) => void) | null };
    const prevUnhandled = typeof g.onunhandledrejection === 'function' ? g.onunhandledrejection : null;
    g.onunhandledrejection = (event: unknown) => {
      try {
        const reason =
          typeof event === 'object' && event !== null && 'reason' in event
            ? (event as { reason?: unknown }).reason
            : event;
        captureSentryException(reason ?? new Error('Unhandled promise rejection'), {
          source: 'globalThis.onunhandledrejection',
          sentryReady,
        });
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          const msg =
            typeof reason === 'object' && reason !== null && 'message' in reason
              ? String((reason as { message?: unknown }).message ?? '')
              : String(reason ?? 'Unhandled promise rejection');
          devLog('[UnhandledRejection]', msg);
        }
      } catch {
        /* ignore */
      }
      if (typeof prevUnhandled === 'function') {
        prevUnhandled(event);
      }
    };
  } catch {
    /* runtime sans hook global de rejection */
  }
}
