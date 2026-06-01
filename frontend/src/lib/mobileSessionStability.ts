import { AppState, Platform } from 'react-native';
import { Image } from 'expo-image';
import { captureSentryException } from './sentryMobile';
import { devLog } from '../utils/devLog';

let installed = false;

/**
 * Comportement type grande app : libérer cache image / signaler pression mémoire
 * pour limiter les fermetures « silencieuses » par le système (surtout Android 2–3 Go RAM).
 */
export function installMobileSessionStability(): void {
  if (installed || Platform.OS === 'web') return;
  installed = true;

  let lastTrimAt = 0;
  const TRIM_COOLDOWN_MS = 45_000;

  const trimCaches = (reason: string) => {
    const now = Date.now();
    if (now - lastTrimAt < TRIM_COOLDOWN_MS) return;
    lastTrimAt = now;
    try {
      void Image.clearMemoryCache();
    } catch {
      /* ignore */
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      devLog('[session-stability] trim caches', reason);
    }
  };

  AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      trimCaches('app-background');
    }
  });

  if (Platform.OS === 'ios') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DeviceEventEmitter } = require('react-native') as {
        DeviceEventEmitter?: { addListener: (ev: string, fn: () => void) => { remove: () => void } };
      };
      DeviceEventEmitter?.addListener?.('memoryWarning', () => {
        trimCaches('ios-memoryWarning');
        captureSentryException(new Error('memoryWarning'), {
          source: 'mobileSessionStability',
          level: 'warning',
        });
      });
    } catch {
      /* ignore */
    }
  }
}
