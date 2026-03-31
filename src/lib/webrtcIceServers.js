/**
 * Configuration RTCPeerConnection pour DirectCall (et futurs appels WebRTC).
 * - STUN publics Google (développement / réseaux ouverts).
 * - TURN optionnel via VITE_TURN_URL (+ user / credential) — recommandé en prod mobile / 4G.
 * - VITE_TURN_URL peut lister plusieurs URLs séparées par des virgules (ex. turn + turns).
 * - VITE_ICE_TRANSPORT_POLICY=relay pour forcer le relais (debug NAT strict).
 */
export function getWebRtcConfiguration() {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

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

  if (turnUrlRaw && turnUsername && turnCredential) {
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
