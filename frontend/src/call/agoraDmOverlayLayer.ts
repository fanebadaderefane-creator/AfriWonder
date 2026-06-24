/**
 * Empilement overlay caméra locale Agora DM.
 * Plein écran sonnerie : sous le dock (pointerEvents none).
 * PiP connecté : au-dessus de la vidéo distante (Stack), sous le bandeau flottant minimisé.
 */
export const AGORA_DM_OVERLAY_Z_CALL_VIDEO = 2;
/** PiP local sur l’écran d’appel — doit peindre par-dessus RemoteView (TextureView). */
export const AGORA_DM_OVERLAY_Z_CALL_PIP = 15;
export const AGORA_DM_OVERLAY_Z_PIP_FLOAT = 9996;

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
      hostElevation: AGORA_DM_OVERLAY_Z_CALL_PIP,
      surfacePointerEvents: 'auto',
    };
  }
  return {
    hostZIndex: AGORA_DM_OVERLAY_Z_CALL_VIDEO,
    hostElevation: AGORA_DM_OVERLAY_Z_CALL_VIDEO,
    surfacePointerEvents: input.containerStyle === 'full' ? 'none' : 'auto',
  };
}
