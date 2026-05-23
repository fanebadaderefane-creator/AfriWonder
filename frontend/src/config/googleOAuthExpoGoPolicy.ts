/**
 * `Constants.executionEnvironment === 'storeClient'` → Expo Go (voir `expo-constants` ExecutionEnvironment.StoreClient).
 * Fichier sans import React Native pour tests Vitest.
 */
export const EXPO_EXECUTION_STORE_CLIENT = 'storeClient';

/**
 * Expo Go Android : redirect `exp://…` — utiliser le client OAuth **Web** comme `client_id`, pas le client Android.
 */
export function applyExpoGoAndroidGoogleWebClientOverride<T extends { webClientId?: string; androidClientId?: string }>(
  ids: T,
  opts: { platformOs: string; executionEnvironment: string },
): T {
  if (opts.platformOs !== 'android') return ids;
  if (opts.executionEnvironment !== EXPO_EXECUTION_STORE_CLIENT) return ids;
  if (!ids.webClientId) return ids;
  return { ...ids, androidClientId: ids.webClientId };
}
