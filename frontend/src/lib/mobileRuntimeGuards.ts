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
  /** Sentry RN instrumente déjà `ErrorUtils` — ne pas chaîner pour éviter double rapport. */
  if (isMobileSentryInitialized()) return;

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
      try {
        captureSentryException(error, {
          isFatal: Boolean(isFatal),
          source: 'ErrorUtils.globalHandler',
        });
      } catch {
        /* */
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        devLog('[GlobalHandler]', isFatal ? 'fatal' : 'non-fatal', error?.message);
      }
      if (typeof previous === 'function') {
        previous(error, isFatal);
      }
    });
  } catch {
    /* WebView / tests hors RN : ignorer */
  }
}
