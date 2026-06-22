/** Garde overlay root — ne jamais monter RtcSurfaceView sans moteur Agora prêt. */
export function shouldMountAgoraDmLocalPreviewOverlay(input: {
  callState: string;
  isVideoCall: boolean;
  localPreviewPinned: boolean;
  localPreviewEngineReady: boolean;
  mountSurface: boolean;
}): boolean {
  if (input.callState === 'ended' || !input.isVideoCall) return false;
  if (!input.localPreviewPinned || !input.localPreviewEngineReady) return false;
  return input.mountSurface;
}
