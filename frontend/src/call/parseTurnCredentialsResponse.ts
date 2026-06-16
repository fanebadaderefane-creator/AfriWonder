/** Parse la réponse `GET /calls/turn-credentials` en config ICE WebRTC. */

export const DEFAULT_STUN_FALLBACKS: RTCIceServer[] = [
  {
    urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
      'stun:stun3.l.google.com:3478',
      'stun:stun4.l.google.com:19302',
    ],
  },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
];

export type ParsedTurnCredentials = {
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
};

function readPublicStun(data: Record<string, unknown>): RTCIceServer[] {
  if (Array.isArray(data.publicStun) && data.publicStun.length > 0) {
    return data.publicStun.map((u) => ({ urls: String(u) }));
  }
  return DEFAULT_STUN_FALLBACKS;
}

function isIceServerEntry(value: unknown): value is RTCIceServer {
  if (!value || typeof value !== 'object') return false;
  const row = value as RTCIceServer;
  return row.urls != null;
}

function isTurnIceServer(entry: RTCIceServer): boolean {
  const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
  return urls.some((u) => {
    const s = String(u).toLowerCase();
    return s.startsWith('turn:') || s.startsWith('turns:');
  });
}

/** Priorité : `iceServers` complet (Metered API) → legacy urls/username/credential. */
export function parseTurnCredentialsResponse(data: unknown): ParsedTurnCredentials {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const serverStun = readPublicStun(d);

  if (Array.isArray(d.iceServers) && d.iceServers.length > 0) {
    const iceServers = d.iceServers.filter(isIceServerEntry);
    if (iceServers.length > 0) {
      const hasTurn = iceServers.some(isTurnIceServer);
      if (d.turnConfigured === true || hasTurn) {
        return { iceServers, turnConfigured: hasTurn };
      }
      return { iceServers, turnConfigured: false };
    }
  }

  const turnUrls = Array.isArray(d.urls) ? d.urls.map(String) : d.urls ? [String(d.urls)] : [];
  const username = String(d.username || '').trim();
  const credential = String(d.credential || '').trim();

  if (d.turnConfigured === true && turnUrls.length > 0 && username && credential) {
    return {
      iceServers: [
        ...serverStun,
        { urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls, username, credential },
      ],
      turnConfigured: true,
    };
  }

  return { iceServers: serverStun, turnConfigured: false };
}
