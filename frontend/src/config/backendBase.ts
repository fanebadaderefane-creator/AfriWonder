import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Même défaut dev que la PWA (racine `.env.example`) : `VITE_API_URL=http://localhost:3000/api`.
 * Ici : origine seulement (sans `/api`). Sur mobile, définir `EXPO_PUBLIC_BACKEND_URL` pour prod / émulateur.
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://localhost:3000';

/**
 * Origine du backend (schéma + hôte + port), sans slash final ni suffixe `/api`.
 * `EXPO_PUBLIC_BACKEND_URL` dans `frontend/.env` ou `app.json` → `extra`.
 */
export function getBackendOrigin(): string {
  if (Platform.OS === 'web') {
    return '';
  }
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    extra?.EXPO_PUBLIC_BACKEND_URL
    || extra?.EXPO_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || ''
  ).trim();
  if (!raw) return DEFAULT_BACKEND_ORIGIN;
  let u = raw.replace(/\/$/, '');
  if (u.endsWith('/api')) u = u.slice(0, -4);
  return u || DEFAULT_BACKEND_ORIGIN;
}
