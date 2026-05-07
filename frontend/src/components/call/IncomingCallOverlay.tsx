/**
 * Ancrage TypeScript + fallback Metro : les bundles runtime préfèrent
 * `IncomingCallOverlay.web.tsx` (web) ou `IncomingCallOverlay.native.tsx` (iOS/Android)
 * avant ce fichier — évite de charger Reanimated/worklets sur le web.
 */
export { IncomingCallOverlay } from './IncomingCallOverlay.native';
