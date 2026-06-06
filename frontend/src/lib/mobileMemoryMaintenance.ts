import { AppState, Platform } from 'react-native';
import { Image } from 'expo-image';
import type { QueryClient } from '@tanstack/react-query';
import { captureSentryException } from './sentryMobile';
import { devLog } from '../utils/devLog';

let installed = false;
let lastTrimAt = 0;
let periodicTimer: ReturnType<typeof setInterval> | null = null;
let registeredQueryClient: QueryClient | null = null;

/** Maintenance RAM au premier plan — continue, sans délai lié à un écran. */
const FOREGROUND_TRIM_INTERVAL_MS = 2 * 60 * 1000;
const TRIM_COOLDOWN_MS = 15_000;

const FORCE_TRIM_REASONS = new Set<TrimMobileCachesReason>([
  'app-background',
  'app-foreground',
  'android-memory',
  'ios-memoryWarning',
  'call-screen-enter',
  'call-screen-exit',
]);

export type TrimMobileCachesReason =
  | 'app-background'
  | 'app-foreground'
  | 'ios-memoryWarning'
  | 'android-memory'
  | 'menu-plus-focus'
  | 'route-change'
  | 'call-screen-enter'
  | 'call-screen-exit'
  | 'periodic-foreground'
  | 'manual';

export type TrimMobileCachesOptions = {
  /** Ignore le cooldown (alertes mémoire, retour premier plan). */
  force?: boolean;
};

/** Enregistré au boot dans `app/_layout.tsx` pour libérer le cache React Query inactif. */
export function registerMobileQueryClient(client: QueryClient): void {
  registeredQueryClient = client;
}

export function clearMobileQueryClientForTests(): void {
  registeredQueryClient = null;
}

function trimReactQueryCache(): void {
  if (!registeredQueryClient) return;
  try {
    /** TanStack Query v5 : `gc()` retiré — on purge les requêtes sans observateur actif. */
    registeredQueryClient.removeQueries({
      predicate: (query) => query.getObserversCount() === 0,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Libère caches image + React Query inactif + suggestion GC JS — best-effort, ne bloque pas l’UI.
 */
export function trimMobileAppCaches(
  reason: TrimMobileCachesReason,
  options?: TrimMobileCachesOptions,
): void {
  const force = Boolean(options?.force) || FORCE_TRIM_REASONS.has(reason);
  const now = Date.now();
  if (!force && now - lastTrimAt < TRIM_COOLDOWN_MS) return;
  lastTrimAt = now;

  try {
    void Image.clearMemoryCache();
  } catch {
    /* ignore */
  }
  try {
    void Image.clearDiskCache();
  } catch {
    /* ignore */
  }

  trimReactQueryCache();

  try {
    const g = globalThis as { gc?: () => void };
    if (typeof g.gc === 'function') {
      g.gc();
    }
  } catch {
    /* Hermes sans expose gc */
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    devLog('[memory] trim', reason);
  }
}

function startForegroundPeriodicTrim(): void {
  if (periodicTimer) return;
  periodicTimer = setInterval(() => {
    if (AppState.currentState !== 'active') return;
    trimMobileAppCaches('periodic-foreground');
  }, FOREGROUND_TRIM_INTERVAL_MS);
}

function stopForegroundPeriodicTrim(): void {
  if (!periodicTimer) return;
  clearInterval(periodicTimer);
  periodicTimer = null;
}

/**
 * Maintenance mémoire globale — complète `installMobileSessionStability`.
 */
export function installMobileMemoryMaintenance(): void {
  if (installed || Platform.OS === 'web') return;
  installed = true;

  AppState.addEventListener('change', (next) => {
    if (next === 'background' || next === 'inactive') {
      trimMobileAppCaches('app-background', { force: true });
      stopForegroundPeriodicTrim();
      return;
    }
    if (next === 'active') {
      trimMobileAppCaches('app-foreground', { force: true });
      startForegroundPeriodicTrim();
    }
  });

  if (AppState.currentState === 'active') {
    startForegroundPeriodicTrim();
  }

  try {
    AppState.addEventListener('memoryWarning', () => {
      const reason: TrimMobileCachesReason =
        Platform.OS === 'ios' ? 'ios-memoryWarning' : 'android-memory';
      trimMobileAppCaches(reason, { force: true });
      captureSentryException(new Error(`${Platform.OS} memoryWarning`), {
        source: 'mobileMemoryMaintenance',
        level: 'warning',
      });
    });
  } catch {
    /* runtime sans événement memoryWarning */
  }

  if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { DeviceEventEmitter } = require('react-native') as {
        DeviceEventEmitter?: { addListener: (ev: string, fn: () => void) => { remove: () => void } };
      };
      DeviceEventEmitter?.addListener?.('memoryWarning', () => {
        trimMobileAppCaches('android-memory', { force: true });
      });
    } catch {
      /* ignore */
    }
  }
}

export function stopMobileMemoryMaintenanceForTests(): void {
  stopForegroundPeriodicTrim();
  installed = false;
  lastTrimAt = 0;
  registeredQueryClient = null;
}
