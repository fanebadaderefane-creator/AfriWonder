import { NativeModules, Platform } from 'react-native';

/**
 * Charge `react-native-webrtc` seulement si le lien natif existe (APK/IPA / dev client).
 * Sans cette garde, `require()` exécute le paquet JS qui lève une erreur synchrone si
 * `WebRTCModule` est absent (ex. Expo Go) — un simple try/catch autour de `require` ne suffit pas toujours.
 */
/** `WebRTCModule` natif présent (build EAS / dev-client) — absent sur Expo Go. */
export function isNativeWebRtcAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  const nm = NativeModules as Record<string, unknown>;
  return nm.WebRTCModule != null;
}

export function tryLoadReactNativeWebRtc(): Record<string, unknown> | null {
  if (Platform.OS === 'web') return null;
  if (!isNativeWebRtcAvailable()) return null;
  try {
    const mod = require('react-native-webrtc') as Record<string, unknown> & {
      registerGlobals?: () => void;
    };
    if (typeof mod.registerGlobals === 'function') {
      mod.registerGlobals();
    }
    return mod;
  } catch {
    return null;
  }
}
