import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Même défaut dev que la PWA (racine `.env.example`) : `VITE_API_URL=http://localhost:3000/api`.
 * Origine seulement (sans `/api`). En prod, définir `EXPO_PUBLIC_BACKEND_URL`.
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://localhost:3000';

function readConfiguredOrigin(): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    extra?.EXPO_PUBLIC_BACKEND_URL
    || extra?.EXPO_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || ''
  ).trim();
  if (!raw) return '';
  let u = raw.replace(/\/$/, '');
  if (u.endsWith('/api')) u = u.slice(0, -4);
  return u;
}

/**
 * Origine du backend (schéma + hôte + port), sans slash final ni suffixe `/api`.
 *
 * - **Web en dev** (Expo sur :8081 / :8082) : sans variable, on pointe vers `localhost:3000`
 *   car il n’y a pas de proxy `/api` sur le serveur Metro.
 * - **Web en prod** : sans variable, chaîne vide = même origine que la page (si API derrière le même hôte).
 * - **iOS / Android** : sans variable → `localhost:3000` (émulateur / tunnel : surcharger avec `.env`).
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

  return DEFAULT_BACKEND_ORIGIN;
}
