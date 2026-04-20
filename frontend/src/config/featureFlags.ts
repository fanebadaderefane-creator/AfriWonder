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
 * Super-app : modules **ouverts par défaut** (données = API réelle, états erreur explicites).
 * Désactiver un module : `EXPO_PUBLIC_ENABLE_<MODULE>=0` dans `.env` / EAS Secrets.
 *
 * Exceptions :
 * - **Stripe** : reste désactivé par défaut (activer quand le flux carte est validé).
 * - **Appels natifs** : WebRTC non géré en runtime managé par défaut ; activer avec
 *   `EXPO_PUBLIC_ENABLE_NATIVE_CALLS=1` sur build custom si vous intégrez `react-native-webrtc`.
 */
export const featureFlags = {
  /** Marketplace : panier, checkout, commandes — API `/api/proxy/products`, `cart`, `orders`. */
  marketplace: readEnvFlag('EXPO_PUBLIC_ENABLE_MARKETPLACE', true),
  /** Contribution crowdfunding — API `/api/proxy/crowdfunding`. */
  crowdfundingContribute: readEnvFlag('EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE', true),
  /** Formations — API `/api/proxy/...` (courses). */
  courses: readEnvFlag('EXPO_PUBLIC_ENABLE_COURSES', true),
  /** Actualités — API news. */
  news: readEnvFlag('EXPO_PUBLIC_ENABLE_NEWS', true),
  /** Hub services (food, jobs, transport, etc.). */
  servicesHub: readEnvFlag('EXPO_PUBLIC_ENABLE_SERVICES_HUB', true),
  /** Paiement carte Stripe — à activer explicitement après validation conformité + implémentation. */
  stripe: readEnvFlag('EXPO_PUBLIC_ENABLE_STRIPE', false),
  /**
   * Appels audio/vidéo WebRTC.
   * Par défaut : `true` sur web, `false` sur natif (l'écran `messages/call.tsx`
   * documente explicitement que `react-native-webrtc` n'est pas dispo en runtime managé).
   */
  callsOnNative: readEnvFlag('EXPO_PUBLIC_ENABLE_NATIVE_CALLS', Platform.OS === 'web'),
};

export type FeatureFlagKey = keyof typeof featureFlags;
