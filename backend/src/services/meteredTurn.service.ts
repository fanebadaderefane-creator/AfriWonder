/**
 * Intégration Metered.ca TURN — credentials récupérés côté serveur uniquement.
 * Doc : https://www.metered.ca/docs/turn-server-service/
 */

export const PUBLIC_STUN_FALLBACKS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:global.stun.twilio.com:3478',
  'stun:stun.relay.metered.ca:80',
];

export type IceServerEntry = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type TurnCredentialsData = {
  urls: string[];
  username: string;
  credential: string;
  iceServers: IceServerEntry[];
  expiresAt: number;
  ttlSec: number;
  realm: string;
  publicStun: string[];
  turnConfigured: boolean;
};

type MeteredCache = {
  expiresAt: number;
  iceServers: IceServerEntry[];
};

let meteredCache: MeteredCache | null = null;

export function buildMeteredCredentialsApiUrl(domain: string, apiKey: string): string {
  const host = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${host}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
}

/** Normalise la réponse JSON Metered (tableau RTCIceServer). */
export function normalizeMeteredIceServers(raw: unknown): IceServerEntry[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: IceServerEntry[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const urls = row.urls;
    if (urls == null) continue;
    if (typeof urls !== 'string' && !Array.isArray(urls)) continue;
    out.push({
      urls: urls as string | string[],
      ...(row.username != null && String(row.username).trim()
        ? { username: String(row.username) }
        : {}),
      ...(row.credential != null && String(row.credential).trim()
        ? { credential: String(row.credential) }
        : {}),
    });
  }
  return out.length > 0 ? out : null;
}

function isTurnUrl(urls: string | string[]): boolean {
  const list = Array.isArray(urls) ? urls : [urls];
  return list.some((u) => String(u).startsWith('turn:') || String(u).startsWith('turns:'));
}

/** Construit le payload API AfriWonder à partir d'une liste iceServers complète. */
export function turnPayloadFromIceServers(
  iceServers: IceServerEntry[],
  input?: { ttlSec?: number; realm?: string },
): TurnCredentialsData {
  const turnEntries = iceServers.filter((s) => isTurnUrl(s.urls));
  const firstTurn = turnEntries[0];
  const allTurnUrls = turnEntries.flatMap((s) =>
    Array.isArray(s.urls) ? s.urls.map(String) : [String(s.urls)],
  );
  const ttlSec = Math.max(60, input?.ttlSec ?? 3600);
  return {
    urls: allTurnUrls,
    username: firstTurn?.username ?? '',
    credential: firstTurn?.credential ?? '',
    iceServers,
    expiresAt: Date.now() + ttlSec * 1000,
    ttlSec,
    realm: input?.realm ?? String(process.env.TURN_REALM || 'metered.ca').trim(),
    publicStun: PUBLIC_STUN_FALLBACKS,
    turnConfigured: turnEntries.length > 0 && Boolean(firstTurn?.username && firstTurn?.credential),
  };
}

/** URLs TURN Metered recommandées (dashboard statique). */
export const METERED_STATIC_TURN_URLS = [
  'turn:global.relay.metered.ca:80',
  'turn:global.relay.metered.ca:80?transport=tcp',
  'turn:global.relay.metered.ca:443',
  'turns:global.relay.metered.ca:443?transport=tcp',
];

export function buildStaticIceServers(urls: string[], username: string, credential: string): IceServerEntry[] {
  const sortedUrls = [...urls].sort((a, b) => {
    const score = (u: string) => {
      const lower = String(u).toLowerCase();
      let s = 0;
      if (lower.startsWith('turns:')) s += 100;
      else if (lower.startsWith('turn:')) s += 10;
      if (lower.includes('transport=tcp')) s += 20;
      return s;
    };
    return score(b) - score(a);
  });
  return [
    { urls: 'stun:stun.relay.metered.ca:80' },
    ...PUBLIC_STUN_FALLBACKS.filter((u) => u !== 'stun:stun.relay.metered.ca:80').map((u) => ({ urls: u })),
    { urls: sortedUrls.length === 1 ? sortedUrls[0] : sortedUrls, username, credential },
  ];
}

export function clearMeteredTurnCache(): void {
  meteredCache = null;
}

/** Récupère les credentials via l'API REST Metered (clé serveur — jamais côté client). */
export async function fetchMeteredTurnCredentials(): Promise<TurnCredentialsData | null> {
  const apiKey = String(process.env.METERED_TURN_API_KEY || '').trim();
  const domain = String(process.env.METERED_TURN_DOMAIN || 'afriwonder.metered.live').trim();
  if (!apiKey) return null;

  const cacheTtlMs = Math.max(60_000, Number(process.env.METERED_TURN_CACHE_MS || 300_000));
  if (meteredCache && meteredCache.expiresAt > Date.now()) {
    return turnPayloadFromIceServers(meteredCache.iceServers, {
      ttlSec: Math.floor((meteredCache.expiresAt - Date.now()) / 1000),
    });
  }

  const url = buildMeteredCredentialsApiUrl(domain, apiKey);
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(Math.min(15_000, Math.max(3_000, Number(process.env.METERED_TURN_FETCH_TIMEOUT_MS || 8_000)))),
  });
  if (!res.ok) return null;

  const raw = (await res.json()) as unknown;
  const iceServers = normalizeMeteredIceServers(raw);
  if (!iceServers) return null;

  const payload = turnPayloadFromIceServers(iceServers);
  if (!payload.turnConfigured) return null;

  meteredCache = {
    expiresAt: Date.now() + cacheTtlMs,
    iceServers,
  };
  return payload;
}

export function isMeteredTurnConfigured(): boolean {
  return Boolean(String(process.env.METERED_TURN_API_KEY || '').trim());
}
