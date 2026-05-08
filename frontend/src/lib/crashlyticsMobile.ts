import { Platform } from 'react-native';
import { devLog } from '../utils/devLog';

type CrashlyticsLike = {
  recordError: (error: Error) => void;
  setAttributes?: (attributes: Record<string, string>) => void;
  setAttribute?: (key: string, value: string) => void;
  log?: (message: string) => void;
};

let crashlyticsRef: CrashlyticsLike | null = null;
let resolved = false;

function tryResolveCrashlytics(): CrashlyticsLike | null {
  if (resolved) return crashlyticsRef;
  resolved = true;
  if (Platform.OS === 'web') return null;
  try {
    // Optional dependency: keep app safe when package is not installed.
    const req = (0, eval)('require') as (name: string) => unknown;
    const mod = req('@react-native-firebase/crashlytics') as
      | { default?: () => CrashlyticsLike }
      | undefined;
    const fn = mod?.default;
    if (typeof fn === 'function') {
      crashlyticsRef = fn();
      return crashlyticsRef;
    }
  } catch {
    // no-op
  }
  return null;
}

export function isCrashlyticsAvailable(): boolean {
  return Boolean(tryResolveCrashlytics());
}

export function captureCrashlyticsError(error: unknown, extra?: Record<string, unknown>): void {
  const crash = tryResolveCrashlytics();
  if (!crash) return;
  const asError = error instanceof Error ? error : new Error(String(error ?? 'unknown error'));
  try {
    if (extra && Object.keys(extra).length > 0) {
      const attrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(extra)) {
        attrs[k] = String(v ?? '');
      }
      if (typeof crash.setAttributes === 'function') {
        crash.setAttributes(attrs);
      } else if (typeof crash.setAttribute === 'function') {
        for (const [k, v] of Object.entries(attrs)) crash.setAttribute(k, v);
      }
    }
    if (typeof crash.log === 'function') {
      crash.log(`[afw] ${asError.message}`);
    }
    crash.recordError(asError);
  } catch (e) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      devLog('[crashlytics.capture.failed]', (e as Error)?.message ?? String(e));
    }
  }
}

