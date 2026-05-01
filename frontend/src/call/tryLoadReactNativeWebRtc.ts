import { NativeModules, Platform } from 'react-native';

/**
 * Charge `react-native-webrtc` seulement si le lien natif existe (APK/IPA / dev client).
 * Sans cette garde, `require()` exécute le paquet JS qui lève une erreur synchrone si
 * `WebRTCModule` est absent (ex. Expo Go) — un simple try/catch autour de `require` ne suffit pas toujours.
 */
export function tryLoadReactNativeWebRtc(): Record<string, unknown> | null {
  if (Platform.OS === 'web') return null;
  const nm = NativeModules as Record<string, unknown>;
  if (nm.WebRTCModule == null) return null;
  try {
    return require('react-native-webrtc') as Record<string, unknown>;
  } catch {
    return null;
  }
}
