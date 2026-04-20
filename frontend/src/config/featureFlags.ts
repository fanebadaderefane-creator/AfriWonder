import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Lecture d'un flag booléen depuis `EXPO_PUBLIC_ENABLE_*`.
 * Accepte `1/true/yes/on` et `0/false/no/off` (insensible à la casse).
 * Toute autre valeur ou absence → `defaultValue`.
 */
function readEnvFlag(name: string, defaultValue: boolean): boolean {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = ((extra?.[name] ?? process.env[name] ?? '') as string).trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  return defaultValue;
}

/**
 * Feature flags mobile. Défauts volontairement **fermés** pour les modules
 * dont la boucle UI ↔ backend n'est pas complète (audit du 20/04/2026) :
 * panier/checkout/orders, formations, news, hub services, crowdfunding
 * contribution, Stripe, appels WebRTC sur natif.
 *
 * Pour activer en prod, définir la variable d'env correspondante dans EAS Secrets.
 */
export const featureFlags = {
  /**
   * Marketplace : panier, checkout, orders.
   * Câblé sur `/api/cart`, `/api/orders`, `/api/addresses`, `/api/payments/*`.
   * Désactivé par défaut tant que le backend prod n'est pas validé bout-en-bout :
   * activer via `EXPO_PUBLIC_ENABLE_MARKETPLACE=1` dans EAS Secrets après QA.
   */
  marketplace: readEnvFlag('EXPO_PUBLIC_ENABLE_MARKETPLACE', false),
  /** Contribution crowdfunding : projet local `SEED_PROJECTS` + OTP simulé (audit B6). */
  crowdfundingContribute: readEnvFlag('EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE', false),
  /** Courses / formations : écrans avec données locales constantes (audit B7). */
  courses: readEnvFlag('EXPO_PUBLIC_ENABLE_COURSES', false),
  /** News : placeholders statiques, pas de feed backend (audit B7). */
  news: readEnvFlag('EXPO_PUBLIC_ENABLE_NEWS', false),
  /** Services locaux (hors insurance) : vitrines statiques (audit B7). */
  servicesHub: readEnvFlag('EXPO_PUBLIC_ENABLE_SERVICES_HUB', false),
  /** Stripe / paiement carte : pas d'écran natif implémenté (audit B8). */
  stripe: readEnvFlag('EXPO_PUBLIC_ENABLE_STRIPE', false),
  /**
   * Appels audio/vidéo WebRTC.
   * Par défaut : `true` sur web, `false` sur natif (l'écran `messages/call.tsx`
   * documente explicitement que `react-native-webrtc` n'est pas dispo en runtime managé).
   */
  callsOnNative: readEnvFlag('EXPO_PUBLIC_ENABLE_NATIVE_CALLS', Platform.OS === 'web'),
};

export type FeatureFlagKey = keyof typeof featureFlags;
