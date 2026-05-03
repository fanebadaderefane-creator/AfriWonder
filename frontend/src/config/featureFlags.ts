import Constants from 'expo-constants';

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
 * - **Appels natifs (UI)** : affichés par défaut sur mobile comme sur le web (icônes + overlay).
 *   WebRTC média navigateur uniquement ; natif utilise l’écran d’appel avec signalisation Socket.IO — désactiver
 *   tout l’UI appels avec `EXPO_PUBLIC_ENABLE_NATIVE_CALLS=0` si nécessaire.
 */
export const featureFlags = {
  /**
   * Marketplace : panier, checkout, commandes — API `/api/proxy/products`, `cart`, `orders`.
   * Module complet (frontend + backend). Toujours actif en production.
   */
  marketplace: readEnvFlag('EXPO_PUBLIC_ENABLE_MARKETPLACE', true),
  /**
   * Contribution crowdfunding — API `/api/proxy/crowdfunding`.
   * Module complet. Toujours actif en production.
   */
  crowdfundingContribute: readEnvFlag('EXPO_PUBLIC_ENABLE_CROWDFUNDING_CONTRIBUTE', true),
  /**
   * Formations — API `/api/proxy/...` (courses).
   * Module complet. Toujours actif en production.
   */
  courses: readEnvFlag('EXPO_PUBLIC_ENABLE_COURSES', true),
  /**
   * Actualités — API news.
   * Module complet. Toujours actif en production.
   */
  news: readEnvFlag('EXPO_PUBLIC_ENABLE_NEWS', true),
  /**
   * Hub services (food, jobs, transport, etc.).
   * Module complet. Toujours actif en production.
   */
  servicesHub: readEnvFlag('EXPO_PUBLIC_ENABLE_SERVICES_HUB', true),
  /** Paiement carte Stripe — activé par défaut. Désactiver via env si clés non configurées. */
  stripe: readEnvFlag('EXPO_PUBLIC_ENABLE_STRIPE', true),
  /** Transfert portefeuille P2P. Backend `POST /api/wallet/transfer` (atomique, idempotent). */
  walletP2PTransfer: readEnvFlag('EXPO_PUBLIC_ENABLE_WALLET_P2P', true),
  /**
   * Entrées appels (header discussion, overlay entrant).
   * Par défaut : **true** partout pour parité avec le web (`messages/[id].tsx`).
   * `EXPO_PUBLIC_ENABLE_NATIVE_CALLS=0` pour masquer complètement sur un build si besoin.
   */
  callsOnNative: readEnvFlag('EXPO_PUBLIC_ENABLE_NATIVE_CALLS', true),
  /**
   * Paid Video Calls (User ↔ Star) — module isolé, backend `/api/stars/*`.
   * Kill-switch global : désactiver via `EXPO_PUBLIC_ENABLE_STAR_CALLS=0`
   * pour masquer le module complet (menu + écrans).
   * Par défaut : **off** tant que les stars n'ont pas été onboardées (Phase 1).
   * Activer après validation de l'onboarding et du flux paiement.
   */
  starCalls: readEnvFlag('EXPO_PUBLIC_ENABLE_STAR_CALLS', false),
  /**
   * Données fictives (hub Services) quand l’API est vide ou indisponible — présentation sans partenaires.
   * Désactiver : `EXPO_PUBLIC_SUPERAPP_DEMO_CONTENT=0`.
   */
  superAppDemoContent: readEnvFlag('EXPO_PUBLIC_SUPERAPP_DEMO_CONTENT', true),
};

export type FeatureFlagKey = keyof typeof featureFlags;
