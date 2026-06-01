/**
 * Ancrage TypeScript + fallback Metro : les bundles runtime préfèrent
 * `MediaViewerModal.web.tsx` (web) ou `MediaViewerModal.native.tsx` (iOS/Android)
 * avant ce fichier — évite de charger Reanimated/worklets sur le web.
 */
export type { MediaViewerItem, MediaViewerModalProps } from './MediaViewerModal.shared';
export { MediaViewerModal } from './MediaViewerModal.native';
