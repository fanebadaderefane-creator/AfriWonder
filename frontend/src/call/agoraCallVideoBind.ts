/** Logique pure — tests sans moteur Agora natif. */

export function shouldAgoraSwitchCameraOnNonce(cameraFlipNonce: number): boolean {
  return cameraFlipNonce > 0;
}

/**
 * Android TextureView (uid 0 via RtcTextureView) — ne jamais appeler setupLocalVideo depuis JS.
 * Double bind JS + canvas React = RangeError stack overflow natif (juin 2026 terrain).
 * iOS : setupLocalVideo reste autorisé via syncAgoraLocalVideoCanvas.
 */
export function shouldAgoraDmSkipSetupLocalVideo(
  platform: string,
  _reason?: string,
  _inChannel?: boolean,
): boolean {
  return platform === 'android';
}
