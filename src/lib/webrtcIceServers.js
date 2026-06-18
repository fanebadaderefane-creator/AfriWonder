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

/** Préfère turns:443 / TCP — opérateurs Mali bloquent souvent UDP 3478. */
function sortTurnUrlsPreferTls(urls) {
  const list = Array.isArray(urls) ? urls.map(String) : [String(urls)];
  return [...list].sort((a, b) => {
    const score = (u) => {
      const lower = String(u).toLowerCase();
      let s = 0;
      if (lower.startsWith('turns:')) s += 100;
      else if (lower.startsWith('turn:')) s += 10;
      if (lower.includes('transport=tcp')) s += 20;
      if (lower.includes(':443')) s += 5;
      return s;
    };
    return score(b) - score(a);
  });
}

function normalizeTurnUrls(urls) {
  if (!urls) return urls;
  const sorted = sortTurnUrlsPreferTls(urls);
  return sorted.length === 1 ? sorted[0] : sorted;
}

/**
 * Configuration RTCPeerConnection pour DirectCall (et futurs appels WebRTC).
 * - STUN publics Google (développement / réseaux ouverts).
 * - TURN temporaire via API backend prioritaire (credentials short-lived).
 * - Fallback env VITE_TURN_* uniquement pour dev local.
 * - iceTransportPolicy: 'all' par défaut (host+srflx+relay) — Maroc↔Maroc intact.
 * - VITE_ICE_TRANSPORT_POLICY=relay pour forcer le relais (debug NAT strict uniquement).
 */
export function getWebRtcConfiguration() {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const cachedTurn = getCachedTurnCredentials();
  if (cachedTurn) {
    iceServers.push({
      urls: normalizeTurnUrls(cachedTurn.urls),
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
    const sorted = normalizeTurnUrls(urls);
    if (sorted) {
      iceServers.push({
        urls: sorted,
        username: turnUsername,
        credential: turnCredential,
      });
    }
  }

  const policyRaw =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_ICE_TRANSPORT_POLICY
      ? String(import.meta.env.VITE_ICE_TRANSPORT_POLICY).trim().toLowerCase()
      : '';
  /** 'all' : ICE choisit host/srflx/relay — évite échec total si TURN UDP injoignable (Mali CGNAT). */
  const iceTransportPolicy = policyRaw === 'relay' ? 'relay' : 'all';

  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy,
  };
}
