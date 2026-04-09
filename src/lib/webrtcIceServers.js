const TURN_CACHE_KEY = 'afw_turn_credentials';

function getCachedTurnCredentials() {
  try {
    const raw = sessionStorage.getItem(TURN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const expiresAt = Number(parsed.expiresAt || 0);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setTemporaryTurnCredentials(payload) {
  try {
    if (!payload || typeof payload !== 'object') return;
    const hasRequired =
      payload.urls &&
      payload.username &&
      payload.credential &&
      Number.isFinite(Number(payload.expiresAt));
    if (!hasRequired) return;
    sessionStorage.setItem(TURN_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // non bloquant
  }
}

/**
 * Configuration RTCPeerConnection pour DirectCall (et futurs appels WebRTC).
 * - STUN publics Google (développement / réseaux ouverts).
 * - TURN temporaire via API backend prioritaire (credentials short-lived).
 * - Fallback env VITE_TURN_* uniquement pour dev local.
 * - VITE_ICE_TRANSPORT_POLICY=relay pour forcer le relais (debug NAT strict).
 */
export function getWebRtcConfiguration() {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const cachedTurn = getCachedTurnCredentials();
  if (cachedTurn) {
    iceServers.push({
      urls: cachedTurn.urls,
      username: cachedTurn.username,
      credential: cachedTurn.credential,
    });
  }

  const turnUrlRaw =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_URL
      ? String(import.meta.env.VITE_TURN_URL).trim()
      : '';
  const turnUsername =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_USERNAME
      ? String(import.meta.env.VITE_TURN_USERNAME).trim()
      : '';
  const turnCredential =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_CREDENTIAL
      ? String(import.meta.env.VITE_TURN_CREDENTIAL).trim()
      : '';

  if (!cachedTurn && turnUrlRaw && turnUsername && turnCredential) {
    const urls = turnUrlRaw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 1) {
      iceServers.push({
        urls: urls[0],
        username: turnUsername,
        credential: turnCredential,
      });
    } else if (urls.length > 1) {
      iceServers.push({
        urls,
        username: turnUsername,
        credential: turnCredential,
      });
    }
  }

  const policyRaw =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ICE_TRANSPORT_POLICY
      ? String(import.meta.env.VITE_ICE_TRANSPORT_POLICY).trim().toLowerCase()
      : '';
  const iceTransportPolicy = policyRaw === 'relay' ? 'relay' : undefined;

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    ...(iceTransportPolicy ? { iceTransportPolicy } : {}),
  };
}
