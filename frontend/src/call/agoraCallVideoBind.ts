/** Logique pure — tests sans moteur Agora natif. */

export function shouldAgoraSwitchCameraOnNonce(cameraFlipNonce: number): boolean {
  return cameraFlipNonce > 0;
}
