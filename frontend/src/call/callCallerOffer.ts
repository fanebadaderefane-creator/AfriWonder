/**
 * Logique pure — envoi d’offre SDP côté appelant après `call:accept`.
 * Régression juin 2026 : `call:accept` + `post_invite` lançaient deux createOffer()
 * en parallèle → InvalidStateError → finishCall('failed') avec hasRemoteSdp=false.
 */

import { peerConnectionHasLocalOffer } from './callAcceptLifecycle';

export const CALLER_OFFER_MAX_RETRIES = 20;
export const CALLER_OFFER_RETRY_MS = 400;

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
