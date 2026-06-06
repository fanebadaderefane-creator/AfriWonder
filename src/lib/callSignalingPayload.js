/**
 * ⛔ Parité PWA avec frontend/src/call/callSignalingPayload.ts — VERROUILLÉ
 * Ne pas diverger : toute modif doit être reflétée dans les deux fichiers + tests.
 */

const SDP_TYPES = new Set(['offer', 'answer', 'rollback', 'pranswer']);

export function inferSdpTypeForPeerConnection(signalingState) {
  const state = String(signalingState || '');
  if (state === 'have-local-offer') return 'answer';
  if (state === 'have-remote-offer') return 'offer';
  if (state === 'stable') return 'offer';
  return null;
}

export function coerceSessionDescriptionInit(raw, signalingState) {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    const sdp = raw.trim();
    if (!sdp.startsWith('v=')) return null;
    const type = inferSdpTypeForPeerConnection(signalingState);
    if (!type) return null;
    return { type, sdp };
  }

  if (typeof raw !== 'object') return null;
  const obj = raw;

  let type = typeof obj.type === 'string' ? obj.type.trim().toLowerCase() : '';
  let sdpBody = typeof obj.sdp === 'string' ? obj.sdp : undefined;

  if ((!type || !sdpBody) && obj.sdp && typeof obj.sdp === 'object') {
    const inner = obj.sdp;
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

  return { type, sdp: sdpBody };
}

export function normalizeInboundCallSignal(raw, signalingState) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = String(raw.kind || '').toLowerCase();

  if (kind === 'sdp') {
    const sdp = coerceSessionDescriptionInit(raw.sdp, signalingState);
    return sdp ? { kind: 'sdp', sdp } : null;
  }

  if (kind === 'offer' || kind === 'answer') {
    const sdp =
      coerceSessionDescriptionInit(raw.sdp, signalingState) ||
      coerceSessionDescriptionInit({ type: kind, sdp: raw.sdp }, signalingState);
    if (sdp) return { kind: 'sdp', sdp };
    if (typeof raw.sdp === 'string' && raw.sdp.trim().startsWith('v=')) {
      return { kind: 'sdp', sdp: { type: kind, sdp: raw.sdp.trim() } };
    }
    return null;
  }

  if (kind === 'ice' || kind === 'candidate') {
    if (raw.candidate === null) return { kind: 'ice', candidate: null };
    if (raw.candidate && typeof raw.candidate === 'object') {
      return { kind: 'ice', candidate: raw.candidate };
    }
  }

  return null;
}

export function normalizeOutboundSessionDescription(desc, signalingState) {
  if (!desc) return null;
  const raw =
    typeof desc === 'object' && typeof desc.toJSON === 'function' ? desc.toJSON() : desc;
  return coerceSessionDescriptionInit(raw, signalingState);
}

export function pickOutboundCallSdp(pc, fallback) {
  const state = pc?.signalingState;
  const local = pc?.localDescription ?? null;
  const localType =
    local && typeof local === 'object' && typeof local.type === 'string'
      ? String(local.type).trim().toLowerCase()
      : '';
  if (SDP_TYPES.has(localType)) {
    const fromPc = normalizeOutboundSessionDescription(local, state);
    if (fromPc) return fromPc;
  }
  const fromFallback = normalizeOutboundSessionDescription(fallback ?? null, state);
  if (fromFallback) return fromFallback;
  return normalizeOutboundSessionDescription(local, state);
}

export function callIdsEqual(a, b) {
  return String(a ?? '').trim() === String(b ?? '').trim();
}

export function callUserIdsEqual(a, b) {
  const left = String(a ?? '').trim().toLowerCase();
  const right = String(b ?? '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}
