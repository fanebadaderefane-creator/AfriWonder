/**
 * ⛔ Invariants cycle d’appel — VERROUILLÉ (juin 2026)
 *
 * Logique pure (tests sans device). Ne pas inverser l’ordre accept/offre/watchdog
 * sans mettre à jour `callAcceptLifecycle.test.ts` et `verify-call-media-readiness.cjs`.
 *
 * Règle Cursor : `.cursor/rules/call-signaling-locked.mdc`
 */

export type CallRole = 'caller' | 'receiver';

/** Le watchdog « connexion média » ne doit pas tourner pendant la sonnerie appelant. */
export function shouldArmMediaConnectionWatchdog(input: {
  role: CallRole;
  peerAccepted: boolean;
}): boolean {
  if (input.role === 'receiver') return true;
  return input.peerAccepted;
}

/** Timer « Pas de réponse » (30 s) : à annuler dès que le correspondant décroche. */
export function shouldClearCallerRingTimeoutOnAccept(input: { role: CallRole }): boolean {
  return input.role === 'caller';
}

/** Ne pas classer « manqué » si le correspondant a déjà décroché (connecting / connected). */
export function shouldFinishCallAsMissed(input: {
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  peerAnswered: boolean;
}): boolean {
  if (input.callState === 'connected' || input.callState === 'ended') return false;
  if (input.peerAnswered) return false;
  return true;
}

/**
 * Receveur en 2G : invite vidéo mais accept audio (downgrade réseau) — continuer en vocal.
 */
export function shouldDowngradeVideoInviteToAudioAnswer(input: {
  startedAsVideo: boolean;
  acceptType?: 'audio' | 'video';
}): boolean {
  return input.startedAsVideo && input.acceptType === 'audio';
}

/**
 * Filet : l’accept socket peut arriver avant que l’appelant ait fini `start()` —
 * réémettre l’offre juste après `call:invite` si le receveur a déjà décroché.
 */
export function shouldSendCallerOfferAfterInvite(input: {
  role: CallRole;
  peerAccepted: boolean;
  callerOfferSent: boolean;
}): boolean {
  return input.role === 'caller' && input.peerAccepted && !input.callerOfferSent;
}

/** Offre locale déjà posée sur la PeerConnection (évite un 2e createOffer en parallèle). */
export function peerConnectionHasLocalOffer(input: {
  signalingState?: string;
  localDescriptionType?: string;
}): boolean {
  if (String(input.signalingState || '') === 'have-local-offer') return true;
  const localType = String(input.localDescriptionType || '').trim().toLowerCase();
  return localType === 'offer';
}

/** Filet prod : réémettre l’offre si la réponse SDP n’est pas arrivée (socket / cold start). */
export function shouldResendCallerOffer(input: {
  role: CallRole;
  peerAccepted: boolean;
  callerOfferSent: boolean;
  hasRemoteDescription: boolean;
  resendCount: number;
  maxResends?: number;
  hasLocalOffer?: boolean;
}): boolean {
  if (input.role !== 'caller') return false;
  if (!input.peerAccepted) return false;
  if (!input.callerOfferSent && !input.hasLocalOffer) return false;
  if (input.hasRemoteDescription) return false;
  const max = input.maxResends ?? 2;
  return input.resendCount < max;
}
