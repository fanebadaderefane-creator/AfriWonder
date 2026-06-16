/**
 * Intégration Metered.ca TURN — credentials récupérés côté serveur uniquement.
 * Doc : https://www.metered.ca/docs/turn-server-service/
 */

import {
  applyMeteredRegionalTurn,
  resolveMeteredTurnRelayHosts,
  rewriteMeteredTurnUrlList,
} from './meteredTurnRegions.js';

export const PUBLIC_STUN_FALLBACKS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun3.l.google.com:3478',
  'stun:stun4.l.google.com:19302',
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
  /** Preset région Metered (diagnostic Maroc↔Mali). */
  turnRegion?: string;
  turnRelayHosts?: string[];
};

type MeteredCache = {
  expiresAt: number;
  iceServers: IceServerEntry[];
  turnRegion?: string;
  turnRelayHosts?: string[];
};

export type MeteredCreateCredentialResult = {
  apiKey: string;
  expiryInSeconds: number;
};

let meteredCache: MeteredCache | null = null;

function meteredHostFromDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

/** GET iceServers — `apiKey` = clé credential (réponse POST), pas la Secret Key. */
export function buildMeteredCredentialsApiUrl(domain: string, apiKey: string): string {
  const host = meteredHostFromDomain(domain);
  return `https://${host}/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
}

/** POST credential éphémère — `secretKey` = Developers → Secret Key. */
export function buildMeteredCreateCredentialUrl(domain: string, secretKey: string): string {
  const host = meteredHostFromDomain(domain);
  return `https://${host}/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey)}`;
}

export function parseMeteredCreateCredentialResponse(raw: unknown): MeteredCreateCredentialResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const apiKey = String(row.apiKey || '').trim();
  const expiryInSeconds = Math.max(60, Number(row.expiryInSeconds || 3600));
  if (!apiKey) return null;
  return { apiKey, expiryInSeconds };
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
  input?: { ttlSec?: number; realm?: string; turnRegion?: string; turnRelayHosts?: string[] },
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
    ...(input?.turnRegion ? { turnRegion: input.turnRegion } : {}),
    ...(input?.turnRelayHosts?.length ? { turnRelayHosts: input.turnRelayHosts } : {}),
  };
}

/** Applique la région TURN configurée (Render) — sans rebuild APK. */
export function applyConfiguredMeteredRegion(iceServers: IceServerEntry[]): {
  iceServers: IceServerEntry[];
  region: ReturnType<typeof resolveMeteredTurnRelayHosts>;
} {
  const region = resolveMeteredTurnRelayHosts();
  return {
    region,
    iceServers: applyMeteredRegionalTurn(iceServers, region.hosts),
  };
}

/** URLs TURN Metered pour la région AfriWonder (France + EU-Ouest + repli). */
export function resolveMeteredStaticTurnUrls(): string[] {
  const { hosts } = resolveMeteredTurnRelayHosts();
  return [...new Set(hosts.flatMap((h) => [
    `turn:${h}:80`,
    `turn:${h}:80?transport=tcp`,
    `turn:${h}:443`,
    `turns:${h}:443?transport=tcp`,
  ]))];
}

/** @deprecated Utiliser resolveMeteredStaticTurnUrls() — conservé pour imports existants. */
export const METERED_STATIC_TURN_URLS = resolveMeteredStaticTurnUrls();

export function buildStaticIceServers(urls: string[], username: string, credential: string): IceServerEntry[] {
  const { hosts } = resolveMeteredTurnRelayHosts();
  const regionalUrls = rewriteMeteredTurnUrlList(urls, hosts);
  const sortedUrls = [...regionalUrls].sort((a, b) => {
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

function meteredFetchTimeoutMs(): number {
  return Math.min(15_000, Math.max(3_000, Number(process.env.METERED_TURN_FETCH_TIMEOUT_MS || 8_000)));
}

/** Récupère les credentials via l'API REST Metered (Secret Key serveur — jamais côté client). */
export async function fetchMeteredTurnCredentials(): Promise<TurnCredentialsData | null> {
  const secretKey = String(process.env.METERED_TURN_API_KEY || '').trim();
  const domain = String(process.env.METERED_TURN_DOMAIN || 'afriwonder.metered.live').trim();
  if (!secretKey) return null;

  const cacheTtlMs = Math.max(60_000, Number(process.env.METERED_TURN_CACHE_MS || 300_000));
  if (meteredCache && meteredCache.expiresAt > Date.now()) {
    return turnPayloadFromIceServers(meteredCache.iceServers, {
      ttlSec: Math.floor((meteredCache.expiresAt - Date.now()) / 1000),
      turnRegion: meteredCache.turnRegion,
      turnRelayHosts: meteredCache.turnRelayHosts,
    });
  }

  const timeoutMs = meteredFetchTimeoutMs();
  const expiryInSeconds = Math.max(
    3600,
    Number(process.env.METERED_TURN_CREDENTIAL_TTL_SEC || 14_400),
  );

  const createRes = await fetch(buildMeteredCreateCredentialUrl(domain, secretKey), {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expiryInSeconds,
      label: `afw-${Date.now()}`,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!createRes.ok) return null;

  const created = parseMeteredCreateCredentialResponse((await createRes.json()) as unknown);
  if (!created) return null;

  const credRes = await fetch(buildMeteredCredentialsApiUrl(domain, created.apiKey), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!credRes.ok) return null;

  const raw = (await credRes.json()) as unknown;
  const iceServersRaw = normalizeMeteredIceServers(raw);
  if (!iceServersRaw) return null;

  const { iceServers, region } = applyConfiguredMeteredRegion(iceServersRaw);
  const payload = turnPayloadFromIceServers(iceServers, {
    ttlSec: created.expiryInSeconds,
    turnRegion: region.preset,
    turnRelayHosts: [...region.hosts],
  });
  if (!payload.turnConfigured) return null;

  const cacheMs = Math.min(cacheTtlMs, created.expiryInSeconds * 1000);
  meteredCache = {
    expiresAt: Date.now() + cacheMs,
    iceServers,
    turnRegion: region.preset,
    turnRelayHosts: [...region.hosts],
  };
  return payload;
}

export function isMeteredTurnConfigured(): boolean {
  return Boolean(String(process.env.METERED_TURN_API_KEY || '').trim());
}
