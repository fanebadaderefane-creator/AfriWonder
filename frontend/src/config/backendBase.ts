import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { stripApiSuffix } from '../utils/urlNormalize';

/**
 * Même défaut dev que la PWA (racine `.env.example`) : `VITE_API_URL=http://localhost:3000/api`.
 * Origine seulement (sans `/api`). En prod, définir `EXPO_PUBLIC_BACKEND_URL`.
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://localhost:3000';

/** Dev : Metro fournit souvent `192.168.x.x:8082` — on réutilise l’hôte pour joindre l’API sur :3000. */
function inferNativeDevBackendOrigin(): string {
  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:3000`;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return DEFAULT_BACKEND_ORIGIN;
}

function readConfiguredOrigin(): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    extra?.EXPO_PUBLIC_BACKEND_URL
    || extra?.EXPO_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || ''
  ).trim();
  if (!raw) return '';
  return stripApiSuffix(raw);
}

/**
 * Origine du backend (schéma + hôte + port), sans slash final ni suffixe `/api`.
 *
 * - **Web en dev** (Expo sur :8081 / :8082) : sans variable, on pointe vers `localhost:3000`
 *   car il n’y a pas de proxy `/api` sur le serveur Metro.
 * - **Web en prod** : sans variable, chaîne vide = même origine que la page (si API derrière le même hôte).
 * - **iOS / Android en dev** : sans variable → hôte dérivé de `expoConfig.hostUri` (`:3000`), sinon
 *   `10.0.2.2:3000` sur Android (émulateur → machine hôte), sinon `localhost:3000`.
 * - **Prod native** : sans variable → `localhost:3000` (peu utile ; préférer `EXPO_PUBLIC_BACKEND_URL`).
 */
export function getBackendOrigin(): string {
  const configured = readConfiguredOrigin();
  if (configured) return configured;

  if (Platform.OS === 'web') {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      return DEFAULT_BACKEND_ORIGIN;
    }
    return '';
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return inferNativeDevBackendOrigin();
  }

  return DEFAULT_BACKEND_ORIGIN;
}
