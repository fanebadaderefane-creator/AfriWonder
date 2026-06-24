/** Garde overlay root — ne jamais monter RtcSurfaceView sans moteur Agora prêt. */
export function shouldMountAgoraDmLocalPreviewOverlay(input: {
  callState: string;
  isVideoCall: boolean;
  localPreviewPinned: boolean;
  localPreviewEngineReady: boolean;
  mountSurface: boolean;
  /** Plein écran sonnerie = rendu dans DirectCallAgoraScreen (sous les contrôles). */
  containerStyle?: 'pip' | 'full' | 'hidden';
}): boolean {
  if (input.callState === 'ended' || !input.isVideoCall) return false;
  if (!input.localPreviewPinned || !input.localPreviewEngineReady) return false;
  if (!input.mountSurface) return false;
  /** Root overlay = PiP / hidden seulement — évite SurfaceView plein écran au-dessus du dock. */
  if (input.containerStyle === 'full') return false;
  return true;
}
