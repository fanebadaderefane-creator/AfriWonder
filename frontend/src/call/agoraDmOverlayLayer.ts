/**
 * Empilement overlay caméra locale Agora DM.
 * Plein écran sonnerie : zone vidéo entre top bar et dock (pas absoluteFill sur root).
 * PiP connecté : au-dessus de la vidéo distante (Stack), sous le bandeau flottant minimisé.
 */
import type { ViewStyle } from 'react-native';
import { AGORA_DM_PIP_TOUCH_ELEVATION, AGORA_DM_PIP_TOUCH_Z_INDEX } from './agoraDmVideoLayout';

export const AGORA_DM_OVERLAY_Z_CALL_VIDEO = 2;
/** PiP local sur l’écran d’appel — au-dessus tap-to-reveal (BUG 11). */
export const AGORA_DM_OVERLAY_Z_CALL_PIP = AGORA_DM_PIP_TOUCH_Z_INDEX;
export const AGORA_DM_OVERLAY_Z_PIP_FLOAT = 9996;

/** Hauteur top bar + statut sur l’écran d’appel (hors safe area). */
export const AGORA_DM_CALL_TOP_CHROME_DP = 56;
/** Dock contrôles + marge bas (hors safe area). */
export const AGORA_DM_CALL_DOCK_DP = 108;

export type AgoraDmOverlayLayer = {
  hostZIndex: number;
  hostElevation: number;
  /** Plein écran sur call screen : laisser passer les touches vers le dock / top bar. */
  surfacePointerEvents: 'auto' | 'none';
};

export function resolveAgoraDmOverlayLayer(input: {
  containerStyle: 'pip' | 'full' | 'hidden';
  minimized: boolean;
}): AgoraDmOverlayLayer {
  const pipFloating = input.containerStyle === 'pip' && input.minimized;
  if (pipFloating) {
    return {
      hostZIndex: AGORA_DM_OVERLAY_Z_PIP_FLOAT,
      hostElevation: AGORA_DM_OVERLAY_Z_PIP_FLOAT,
      surfacePointerEvents: 'auto',
    };
  }
  if (input.containerStyle === 'pip') {
    return {
      hostZIndex: AGORA_DM_OVERLAY_Z_CALL_PIP,
      hostElevation: AGORA_DM_PIP_TOUCH_ELEVATION,
      surfacePointerEvents: 'auto',
    };
  }
  return {
    hostZIndex: AGORA_DM_OVERLAY_Z_CALL_VIDEO,
    hostElevation: AGORA_DM_OVERLAY_Z_CALL_VIDEO,
    surfacePointerEvents: input.containerStyle === 'full' ? 'none' : 'auto',
  };
}

/**
 * Hôte overlay root (_layout) — en `full` sur l’écran d’appel, ne pas recouvrir top bar / dock.
 * Sinon l’utilisateur voit un écran noir total (sibling au-dessus du Stack).
 */
export function resolveAgoraDmOverlayHostLayout(input: {
  containerStyle: 'pip' | 'full' | 'hidden';
  minimized: boolean;
  safeTop: number;
  safeBottom: number;
}): ViewStyle {
  const base: ViewStyle = { position: 'absolute', left: 0, right: 0 };
  if (input.containerStyle === 'full' && !input.minimized) {
    return {
      ...base,
      top: input.safeTop + AGORA_DM_CALL_TOP_CHROME_DP,
      bottom: input.safeBottom + AGORA_DM_CALL_DOCK_DP,
    };
  }
  return { ...base, top: 0, bottom: 0 };
}
