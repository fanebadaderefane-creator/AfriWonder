/** Logique pure — tests sans moteur Agora natif. */

export function shouldAgoraSwitchCameraOnNonce(cameraFlipNonce: number): boolean {
  return cameraFlipNonce > 0;
}

/**
 * Android TextureView : setupLocalVideo JS seulement quand nécessaire.
 * En canal : toujours re-bind (PiP connecté). Hors canal : layout / flip / pin seulement.
 */
export function shouldAgoraDmSkipSetupLocalVideo(
  platform: string,
  reason?: string,
  inChannel?: boolean,
): boolean {
  if (platform !== 'android') return false;
  if (inChannel) return false;
  if (!reason) return true;
  if (
    reason.includes('surface_layout_') ||
    reason.includes('overlay_layout_') ||
    reason.includes('pin_local') ||
    reason.includes('switch_camera') ||
    reason.includes('canvas_after_')
  ) {
    return false;
  }
  return true;
}
