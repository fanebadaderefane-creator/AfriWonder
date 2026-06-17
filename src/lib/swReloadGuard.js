/**
 * Garde-fou PWA : ne pas recharger la page pendant un appel WebRTC ou une vidéo active.
 * Évite écran noir / perte de négociation ICE sur le feed ou DirectCall.
 */
export function shouldDeferServiceWorkerReload() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__AFW_WEBRTC_ACTIVE__);
}
