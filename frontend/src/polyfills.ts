/**
 * Doit être importé une fois au démarrage (avant WebCrypto / clés E2EE).
 * Requis pour `crypto.getRandomValues` sur certaines builds React Native.
 */
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import {
  isBenignMediaConsoleNoise,
} from './utils/webBenignBrowserNoise';

/** WebRTC natif : globals (`navigator.mediaDevices`, etc.) avant tout écran d’appel. */
if (Platform.OS !== 'web') {
  try {
    const nm = require('react-native').NativeModules as Record<string, unknown>;
    if (nm.WebRTCModule != null) {
      const { registerGlobals } = require('react-native-webrtc') as { registerGlobals?: () => void };
      registerGlobals?.();
    }
  } catch {
    /* Expo Go / build sans react-native-webrtc */
  }
}

/**
 * expo-video (web) appelle `HTMLVideoElement.play()` sans rattacher `.catch()` sur chaque vidéo.
 * Les erreurs MIME / codec deviennent « Uncaught (in promise) » même si `safePlay` vérifie le retour du wrapper.
 */
function installWebVideoPlayPromiseGuards() {
  if (typeof HTMLVideoElement === 'undefined') return;
  const proto = HTMLVideoElement.prototype as HTMLVideoElement & Record<string, unknown>;
  const guardKey = '__afwHtmlVideoPlayPromiseGuard';
  if (proto[guardKey]) return;
  proto[guardKey] = true;
  const originalPlay = HTMLVideoElement.prototype.play;
  proto.play = function afwWrappedPlay(
    this: HTMLVideoElement,
    ...args: Parameters<typeof originalPlay>
  ): ReturnType<typeof originalPlay> {
    let ret: ReturnType<typeof originalPlay>;
    try {
      ret = originalPlay.apply(this, args);
    } catch (error) {
      if (isBenignMediaConsoleNoise(error)) {
        return Promise.resolve(undefined) as ReturnType<typeof originalPlay>;
      }
      throw error;
    }
    if (ret != null && typeof (ret as Promise<unknown>).catch === 'function') {
      return (ret as Promise<unknown>).catch((reason: unknown) => {
        if (isBenignMediaConsoleNoise(reason)) {
          return undefined;
        }
        return Promise.reject(reason);
      }) as ReturnType<typeof originalPlay>;
    }
    return ret;
  };
}

/**
 * Web : `expo-font` / FontFaceObserver peut rejeter avec `6000ms timeout exceeded` si la police
 * vector-icons n'est pas prête assez vite. Le handler dans `_layout` arrive trop tard pour le
 * LogBox — on enregistre ici avant tout autre module React.
 */
if (typeof window !== 'undefined') {
  try {
    installWebVideoPlayPromiseGuards();
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const messageFromUnknown = (raw: unknown): string => {
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw !== null && 'message' in raw) {
      return String((raw as Error).message ?? '');
    }
    return String(raw ?? '');
  };

  const swallowFontTimeout = (raw: unknown) => {
    const text = messageFromUnknown(raw).toLowerCase();
    return text.includes('ms timeout exceeded') || text.includes('timeout exceeded');
  };

  const swallowBenignWebNoise = (raw: unknown) =>
    swallowFontTimeout(raw) || isBenignMediaConsoleNoise(raw);

  const onUnhandledRejection = (event: Event) => {
    const e = event as PromiseRejectionEvent;
    if (swallowBenignWebNoise(e.reason)) {
      e.preventDefault();
      e.stopPropagation?.();
    }
  };
  const onWindowError = (event: Event) => {
    const ev = event as ErrorEvent;
    if (swallowBenignWebNoise(ev.message) || swallowBenignWebNoise(ev.error)) {
      ev.preventDefault();
      ev.stopPropagation?.();
    }
  };
  /** Capture : avant LogBox / handlers RN Web qui réaffichent la même erreur deux fois. */
  window.addEventListener('unhandledrejection', onUnhandledRejection, true);
  window.addEventListener('error', onWindowError, true);
}
