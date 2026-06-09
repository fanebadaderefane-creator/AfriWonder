/**
 * Logique pure — envoi d’offre SDP côté appelant après `call:accept`.
 * Régression juin 2026 : `call:accept` + `post_invite` lançaient deux createOffer()
 * en parallèle → InvalidStateError → finishCall('failed') avec hasRemoteSdp=false.
 */

import { peerConnectionHasLocalOffer, type CallRole } from './callAcceptLifecycle';

export type CallerNegotiationSnapshot = {
  hasLocalOffer: boolean;
  hasRemoteDescription: boolean;
};

/**
 * Après accept : offre envoyée ou posée localement — attendre la réponse SDP
 * (setRemoteDescription + ICE), pas un nouveau createOffer.
 */
export function isCallerOfferNegotiationLocked(input: {
  role: CallRole;
  peerAccepted: boolean;
  callerOfferSent: boolean;
} & CallerNegotiationSnapshot): boolean {
  if (input.role !== 'caller') return false;
  if (!input.peerAccepted) return false;
  if (input.callerOfferSent && !input.hasRemoteDescription) return true;
  if (input.hasLocalOffer && !input.hasRemoteDescription) return true;
  return false;
}

/** createOffer interdit tant que la négociation initiale attend la réponse distante. */
export function shouldCreateCallerOffer(input: {
  callerOfferSent: boolean;
  signalingState?: string;
  localDescriptionType?: string;
  negotiationLocked: boolean;
}): boolean {
  if (input.negotiationLocked) return false;
  return shouldAttemptCallerCreateOffer({
    callerOfferSent: input.callerOfferSent,
    signalingState: input.signalingState,
    localDescriptionType: input.localDescriptionType,
  });
}

/**
 * Bootstrap a déjà attaché le micro — à accept_rx : createOffer seulement,
 * pas de reset transceiver / re-addTrack (cause mid=0 recv parameters Android).
 */
export function shouldSkipCallerOfferMediaSetup(input: {
  localTracksAttachedAtBootstrap: boolean;
  hasActiveAudioSender: boolean;
}): boolean {
  return input.localTracksAttachedAtBootstrap && input.hasActiveAudioSender;
}

/** Ne pas addTrack / reset transceivers pendant ou après la 1re offre. */
export function shouldMutateCallerMediaForOffer(input: {
  negotiationLocked: boolean;
  callerOfferSent: boolean;
  hasLocalOffer: boolean;
  mediaPrepared: boolean;
  localTracksAttachedAtBootstrap: boolean;
  hasActiveAudioSender: boolean;
}): boolean {
  if (shouldSkipCallerOfferMediaSetup(input)) return false;
  if (input.negotiationLocked || input.callerOfferSent || input.hasLocalOffer) return false;
  if (input.mediaPrepared) return false;
  return true;
}

/** Un seul reset média natif avant la 1re offre réussie (évite mid=0 en boucle). */
export function shouldAttemptCallerOfferMediaRecovery(input: {
  negotiationLocked: boolean;
  callerOfferSent: boolean;
  hasLocalOffer: boolean;
  recoveryAlreadyAttempted: boolean;
  localTracksAttachedAtBootstrap: boolean;
  hasActiveAudioSender: boolean;
}): boolean {
  if (shouldSkipCallerOfferMediaSetup(input)) return false;
  if (input.recoveryAlreadyAttempted) return false;
  if (input.negotiationLocked || input.callerOfferSent || input.hasLocalOffer) return false;
  return true;
}

/**
 * Android : onnegotiationneeded peut spammer — ignorer tant que l’appel n’est pas
 * connecté ou qu’une négociation contrôlée est en cours.
 */
export function shouldIgnoreNegotiationNeeded(input: {
  isNativeRuntime: boolean;
  connectionState?: string;
  callState?: string;
  offerNegotiationInFlight: boolean;
  negotiationLocked: boolean;
}): boolean {
  if (!input.isNativeRuntime) return false;
  if (input.offerNegotiationInFlight || input.negotiationLocked) return true;
  const conn = String(input.connectionState || '');
  if (conn === 'connected') return false;
  if (String(input.callState || '') === 'connected') return false;
  return true;
}

/** Pas d’iceRestart / nouveau SDP tant que l’answer distante n’est pas arrivée. */
export function shouldDeferIceRestartOffer(input: {
  role: CallRole;
  negotiationLocked: boolean;
  callerOfferSent: boolean;
  hasRemoteDescription: boolean;
}): boolean {
  if (input.role !== 'caller') return false;
  if (input.negotiationLocked) return true;
  if (input.callerOfferSent && !input.hasRemoteDescription) return true;
  return false;
}

export function shouldRetryCallerOfferAfterAccept(input: {
  sent: boolean;
  callerOfferSent: boolean;
  peerAccepted: boolean;
  cancelled: boolean;
}): boolean {
  if (input.cancelled || !input.peerAccepted) return false;
  if (input.sent || input.callerOfferSent) return false;
  return true;
}

export const CALLER_OFFER_MAX_RETRIES = 20;
export const CALLER_OFFER_RETRY_MS = 400;
/** Attente max du bootstrap appelant (TURN + permissions + getUserMedia) avant d’épuiser les retries. */
export const CALLER_BOOTSTRAP_POLL_MS = 100;
export const CALLER_BOOTSTRAP_MAX_WAIT_MS = 45_000;

export function callerBootstrapMaxWaitPolls(
  maxWaitMs = CALLER_BOOTSTRAP_MAX_WAIT_MS,
  pollMs = CALLER_BOOTSTRAP_POLL_MS,
): number {
  return Math.ceil(maxWaitMs / pollMs);
}

/** Ne pas appeler createOffer si une offre locale existe déjà. */
export function shouldAttemptCallerCreateOffer(input: {
  callerOfferSent: boolean;
  signalingState?: string;
  localDescriptionType?: string;
}): boolean {
  if (input.callerOfferSent) return false;
  return !peerConnectionHasLocalOffer({
    signalingState: input.signalingState,
    localDescriptionType: input.localDescriptionType,
  });
}

/** Sérialise les tâches async (une seule négociation offer à la fois). */
export function chainCallerOfferTask(
  chain: Promise<boolean>,
  task: () => Promise<boolean>,
): { result: Promise<boolean>; nextChain: Promise<boolean> } {
  const result = chain
    .catch(() => false)
    .then(() => task())
    .catch(() => false);
  return { result, nextChain: result };
}

/** Évite de couper un appel en sonnerie sur un call:end sans callId (événement stale). */
export function shouldIgnoreInboundCallEnd(input: {
  payloadCallId?: string;
  localCallId: string;
  callState: 'ringing' | 'connecting' | 'connected' | 'ended';
  role: 'caller' | 'receiver';
}): boolean {
  const rx = String(input.payloadCallId || '').trim();
  const local = String(input.localCallId || '').trim();
  if (rx && local && rx !== local) return true;
  if (!rx && input.role === 'caller' && input.callState === 'ringing') return true;
  return false;
}

/** Le watchdog ne doit pas lancer iceRestart pendant createOffer/setLocalDescription. */
export function shouldDeferConnectionWatchdogIceRestart(offerNegotiationInFlight: boolean): boolean {
  return offerNegotiationInFlight;
}

export function shouldFailCallerAfterOfferRetries(attempt: number, max = CALLER_OFFER_MAX_RETRIES): boolean {
  return attempt > max;
}

/** Ne pas compter les retries tant que le PC + média local ne sont pas prêts (accept rapide). */
export function shouldCountCallerOfferRetryAttempt(input: { callerBootstrapReady: boolean }): boolean {
  return input.callerBootstrapReady;
}
