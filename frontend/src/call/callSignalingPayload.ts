/**
 * ⛔ MODULE SIGNALISATION APPELS — VERROUILLÉ (juin 2026)
 *
 * Normalise les SDP offer/answer/ICE pour web + Android + iOS.
 * Régression historique : SDP sans `type` en transit socket → appelant bloqué.
 *
 * Ne pas simplifier / bypasser sans tests :
 *   npm run test -- src/call/callSignalingPayload.test.ts
 *   node scripts/verify-call-media-readiness.cjs
 *
 * Règle Cursor : `.cursor/rules/call-signaling-locked.mdc`
 *
 * Payloads socket `call:*` — champs alignés sur le relais backend (`index.ts`).
 */

import { sanitizeInboundSdpForWebRtc } from './callSdpWebCompat';

export type CallMediaType = 'audio' | 'video';

export type CallSdpType = 'offer' | 'answer' | 'rollback' | 'pranswer';

export type CallSignalSdpPayload = { type: CallSdpType; sdp: string };

export type NormalizedCallSignal =
  | { kind: 'sdp'; sdp: CallSignalSdpPayload }
  | { kind: 'ice'; candidate: RTCIceCandidateInit | null };

const SDP_TYPES = new Set<string>(['offer', 'answer', 'rollback', 'pranswer']);

/** Déduit offer/answer quand le champ `type` a été perdu en transit socket. */
export function inferSdpTypeForPeerConnection(signalingState: string | undefined): CallSdpType | null {
  const state = String(signalingState || '');
  if (state === 'have-local-offer') return 'answer';
  if (state === 'have-remote-offer') return 'offer';
  if (state === 'stable') return 'offer';
  return null;
}

export function coerceSessionDescriptionInit(
  raw: unknown,
  signalingState?: string,
): CallSignalSdpPayload | null {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    const sdp = raw.trim();
    if (!sdp.startsWith('v=')) return null;
    const type = inferSdpTypeForPeerConnection(signalingState);
    if (!type) return null;
    return { type, sdp: sanitizeInboundSdpForWebRtc(sdp) };
  }

  if (typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  let type = typeof obj.type === 'string' ? obj.type.trim().toLowerCase() : '';
  let sdpBody = typeof obj.sdp === 'string' ? obj.sdp : undefined;

  if ((!type || !sdpBody) && obj.sdp && typeof obj.sdp === 'object') {
    const inner = obj.sdp as Record<string, unknown>;
    if (!type && typeof inner.type === 'string') type = inner.type.trim().toLowerCase();
    if (!sdpBody && typeof inner.sdp === 'string') sdpBody = inner.sdp;
  }

  if (!SDP_TYPES.has(type)) {
    const inferred = inferSdpTypeForPeerConnection(signalingState);
    if (inferred && sdpBody) type = inferred;
  }

  if (!SDP_TYPES.has(type) || !sdpBody || !String(sdpBody).trim().startsWith('v=')) {
    return null;
  }

  return { type: type as CallSdpType, sdp: sanitizeInboundSdpForWebRtc(String(sdpBody)) };
}

/**
 * Normalise les signaux entrants (Expo `kind:sdp`, legacy PWA `kind:offer|answer`, ICE).
 * Évite `setRemoteDescription` sans `type` (Firefox / DirectCall / perte JSON).
 */
export function normalizeInboundCallSignal(
  raw: unknown,
  signalingState?: string,
): NormalizedCallSignal | null {
  if (!raw || typeof raw !== 'object') return null;
  const sig = raw as Record<string, unknown>;
  const kind = String(sig.kind || '').toLowerCase();

  if (kind === 'sdp') {
    const sdp = coerceSessionDescriptionInit(sig.sdp, signalingState);
    return sdp ? { kind: 'sdp', sdp } : null;
  }

  if (kind === 'offer' || kind === 'answer') {
    const sdp =
      coerceSessionDescriptionInit(sig.sdp, signalingState) ||
      coerceSessionDescriptionInit({ type: kind, sdp: sig.sdp }, signalingState);
    if (sdp) return { kind: 'sdp', sdp };
    if (typeof sig.sdp === 'string' && sig.sdp.trim().startsWith('v=')) {
      return { kind: 'sdp', sdp: { type: kind as CallSdpType, sdp: sanitizeInboundSdpForWebRtc(sig.sdp.trim()) } };
    }
    return null;
  }

  if (kind === 'ice' || kind === 'candidate') {
    if (sig.candidate === null) return { kind: 'ice', candidate: null };
    if (sig.candidate && typeof sig.candidate === 'object') {
      return { kind: 'ice', candidate: sig.candidate as RTCIceCandidateInit };
    }
  }

  return null;
}

/** Garantit un payload SDP valide avant émission socket. */
export function normalizeOutboundSessionDescription(
  desc: RTCSessionDescriptionInit | RTCSessionDescription | null | undefined,
  signalingState?: string,
): CallSignalSdpPayload | null {
  if (!desc) return null;
  const raw =
    typeof desc === 'object' &&
    'toJSON' in desc &&
    typeof (desc as RTCSessionDescription).toJSON === 'function'
      ? (desc as RTCSessionDescription).toJSON()
      : desc;
  return coerceOutboundSessionDescriptionInit(raw, signalingState);
}

/**
 * SDP local sortant — en `have-local-offer` le type DOIT être `offer` (pas `answer`).
 * Régression Android : `inferSdpTypeForPeerConnection` renvoyait `answer` → offer jamais acceptée.
 */
export function coerceOutboundSessionDescriptionInit(
  raw: unknown,
  signalingState?: string,
): CallSignalSdpPayload | null {
  const parsed = coerceSessionDescriptionInit(raw, signalingState);
  if (!parsed) return null;
  const state = String(signalingState || '');
  if (state === 'have-local-offer' && parsed.type !== 'offer') {
    return { type: 'offer', sdp: parsed.sdp };
  }
  if (state === 'have-local-pranswer' && parsed.type !== 'pranswer') {
    return { type: 'pranswer', sdp: parsed.sdp };
  }
  return parsed;
}

/** Préfère `pc.localDescription` (fiable après setLocalDescription) puis le fallback session init. */
export function pickOutboundCallSdp(
  pc: RTCPeerConnection | null | undefined,
  fallback?: RTCSessionDescriptionInit | RTCSessionDescription | null,
): CallSignalSdpPayload | null {
  const state = pc?.signalingState;
  const local = pc?.localDescription ?? null;
  const localType =
    local && typeof local === 'object' && typeof (local as RTCSessionDescription).type === 'string'
      ? String((local as RTCSessionDescription).type).trim().toLowerCase()
      : '';
  if (SDP_TYPES.has(localType)) {
    const fromPc = normalizeOutboundSessionDescription(local, state);
    if (fromPc) return fromPc;
  }
  const fromFallback = normalizeOutboundSessionDescription(fallback ?? null, state);
  if (fromFallback) return fromFallback;
  return normalizeOutboundSessionDescription(local, state);
}

export function callIdsEqual(a: unknown, b: unknown): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

/** Compare IDs utilisateur (UUID string / number JSON) — évite faux négatifs sur `call:invite`. */
export function callUserIdsEqual(a: unknown, b: unknown): boolean {
  const left = String(a ?? '').trim().toLowerCase();
  const right = String(b ?? '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}

export function buildCallAcceptPayload(input: {
  callId: string;
  accepterUserId: string;
  callerUserId: string;
  type: CallMediaType;
}): { callId: string; fromUserId: string; toUserId: string; type: CallMediaType } {
  return {
    callId: input.callId,
    fromUserId: input.accepterUserId,
    toUserId: input.callerUserId,
    type: input.type,
  };
}

export function buildCallDeclinePayload(input: {
  callId: string;
  declinerUserId: string;
  callerUserId: string;
  reason?: string;
}): { callId: string; fromUserId: string; toUserId: string; reason?: string } {
  return {
    callId: input.callId,
    fromUserId: input.declinerUserId,
    toUserId: input.callerUserId,
    ...(input.reason ? { reason: input.reason } : {}),
  };
}

/**
 * Compte les sections média (`m=audio` / `m=video`) d’un SDP.
 *
 * Sert de garde anti-régression : en Unified Plan avec `addTrack`, passer les
 * contraintes héritées `offerToReceiveAudio` / `offerToReceiveVideo` à
 * `createOffer` / `createAnswer` peut générer une SECONDE section audio
 * (`mid='1'`) recvonly en doublon. L’appelant échoue alors sur
 * `setRemoteDescription` :
 *   « Failed to set remote answer sdp: Failed to set remote audio description
 *     send parameters for m-section with mid='1' »
 * → l’appelant reste bloqué « Connexion lente ou bloquée » alors que le
 *   receveur est connecté (asymétrie audio).
 */
export function countSdpMediaSections(sdp: string | undefined, kind: 'audio' | 'video'): number {
  if (!sdp) return 0;
  const matches = sdp.match(new RegExp(`^m=${kind}\\b`, 'gm'));
  return matches ? matches.length : 0;
}

/**
 * Options `createOffer` / `createAnswer` sûres en Unified Plan.
 *
 * On NE passe PAS `offerToReceiveAudio` / `offerToReceiveVideo` : la direction
 * de réception est déjà portée par les transceivers issus de `addTrack` /
 * `addTransceiver`. Réintroduire ces contraintes héritées recrée la section
 * audio en doublon (`mid='1'`) — voir `countSdpMediaSections`.
 */
export function callSdpNegotiationOptions(): undefined {
  return undefined;
}
