/**
 * Décisions réseau d'un appel WebRTC — fonctions PURES (testables sans device).
 *
 * Contexte AfriWonder : marché Afrique de l'Ouest, majorité 2G / 3G / 4G, Wi‑Fi rare.
 * Les réseaux mobiles opérateurs (Orange, MTN, Moov…) sont en Carrier‑Grade NAT (CGNAT) :
 * le P2P direct échoue presque toujours → il faut **relayer via TURN** sinon « ICE connected »
 * sans flux audio/vidéo (symptôme : aucun des deux n'entend l'autre).
 */

export type VideoQualityProfile = {
  width: number;
  height: number;
  frameRate: number;
  label: 'low-bandwidth' | 'medium' | 'hd';
  /** Plafond de débit vidéo (bps) adapté au réseau — évite les coupures sur 2G/3G saturé. */
  maxBitrate: number;
};

export const VIDEO_PROFILES: Record<'low' | 'medium' | 'high', VideoQualityProfile> = {
  low: { width: 320, height: 240, frameRate: 15, label: 'low-bandwidth', maxBitrate: 200_000 },
  medium: { width: 640, height: 480, frameRate: 24, label: 'medium', maxBitrate: 500_000 },
  high: { width: 1280, height: 720, frameRate: 30, label: 'hd', maxBitrate: 1_500_000 },
};

export type NetworkSnapshot = {
  /** `NetInfo` type : 'cellular' | 'wifi' | 'ethernet' | 'none' | 'unknown' | … */
  type?: string | null;
  /** `NetInfo` details.cellularGeneration : '2g' | '3g' | '4g' | '5g' | null */
  cellularGeneration?: string | null;
};

export function isCellularNetwork(net: NetworkSnapshot | null | undefined): boolean {
  return String(net?.type || '').toLowerCase() === 'cellular';
}

/**
 * Réseau probablement derrière CGNAT opérateur (cellulaire explicite).
 *
 * Parité Web/Android (juin 2026) : `unknown` ne force plus le relais **sur web**
 * (NetInfo ambigu). Sur **natif**, `unknown` est fréquent au Mali → traité CGNAT.
 */
export function shouldTreatAsMobileCgnatNetwork(
  net: NetworkSnapshot | null | undefined,
  isWeb: boolean,
): boolean {
  const type = String(net?.type || '').toLowerCase();
  if (type === 'wifi' || type === 'ethernet') return false;
  if (isCellularNetwork(net)) return true;
  if (!isWeb && type === 'unknown') return true;
  return false;
}

/** Intervalle entre retentes `MediaStream#toURL()` avant montage RTCView natif. */
export const NATIVE_RTC_BIND_RETRY_INTERVAL_MS = 200;

/** Retentes `toURL()` — 2G/3G et NetInfo `unknown` (Mali) ont besoin de plus de temps. */
export function nativeRtcBindRetryAttempts(net: NetworkSnapshot | null | undefined): number {
  if (isSlowCellularNetwork(net)) return 45;
  const type = String(net?.type || '').toLowerCase();
  if (type === 'cellular' || type === 'unknown') return 30;
  return 15;
}

/** 2G ou 3G opérateur — profils bas débit et délais ICE plus longs. */
export function isSlowCellularNetwork(net: NetworkSnapshot | null | undefined): boolean {
  if (!isCellularNetwork(net)) return false;
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  return gen === '2g' || gen === '3g';
}

/** Bitrate Opus vocal (bps) — 2G très bas, 3G intermédiaire, sinon standard VoIP. */
export const VOICE_OPUS_BITRATE_2G = 16_000;
export const VOICE_OPUS_BITRATE_3G = 24_000;
export const VOICE_OPUS_BITRATE_DEFAULT = 32_000;

export function pickVoiceOpusBitrateForNetwork(net: NetworkSnapshot | null | undefined): number {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') return VOICE_OPUS_BITRATE_2G;
  if (isCellularNetwork(net) && gen === '3g') return VOICE_OPUS_BITRATE_3G;
  return VOICE_OPUS_BITRATE_DEFAULT;
}

/** Pool ICE pré-alloué — audit juin 2026 (Maroc↔Mali, latence élevée). */
export const CALL_ICE_CANDIDATE_POOL_SIZE = 10;

/** Watchdog « connexion média » — TURN + 2G/3G nécessitent plus de temps qu’en Wi‑Fi. */
export function callConnectionWatchdogMs(net: NetworkSnapshot | null | undefined): number {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  const type = String(net?.type || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') return 90_000;
  if (isCellularNetwork(net) && gen === '3g') return 75_000;
  if (type === 'unknown') return 75_000;
  return 60_000;
}

/** Délai avant message « connexion lente » après acceptation. */
export function callMediaReadyHintMs(net: NetworkSnapshot | null | undefined): number {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  const type = String(net?.type || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') return 35_000;
  if (isCellularNetwork(net) && gen === '3g') return 28_000;
  if (type === 'unknown') return 28_000;
  return 20_000;
}

/**
 * Appel sortant vidéo sur 2G → vocal automatique (vidéo instable / échec fréquent).
 * 3G conserve la vidéo avec profil basse qualité (`pickVideoProfileForNetwork`).
 */
export function resolveOutboundCallTypeForNetwork(
  requested: 'audio' | 'video',
  net: NetworkSnapshot | null | undefined,
): { type: 'audio' | 'video'; downgradedFromVideo: boolean } {
  if (requested !== 'video') return { type: requested, downgradedFromVideo: false };
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') {
    return { type: 'audio', downgradedFromVideo: true };
  }
  return { type: 'video', downgradedFromVideo: false };
}

export function outboundVideoDowngradeMessage(net: NetworkSnapshot | null | undefined): string | null {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') {
    return 'Réseau 2G détecté : l’appel démarre en mode vocal pour une meilleure stabilité.';
  }
  return null;
}

/** Sans TURN, le cellulaire Afrique (CGNAT) ne passe presque jamais l’audio. */
export function shouldBlockCellularWithoutTurn(input: {
  turnConfigured: boolean;
  net: NetworkSnapshot | null | undefined;
  isWeb?: boolean;
}): boolean {
  if (input.turnConfigured) return false;
  return shouldTreatAsMobileCgnatNetwork(input.net, input.isWeb ?? false);
}

/**
 * Qualité vidéo selon le réseau. 2G/3G → basse, 4G → moyenne, Wi‑Fi/Ethernet → HD.
 * Cellulaire de génération inconnue → moyenne (prudent). Tout le reste → moyenne.
 */
export function pickVideoProfileForNetwork(net: NetworkSnapshot | null | undefined): VideoQualityProfile {
  const type = String(net?.type || '').toLowerCase();
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  const cellular = type === 'cellular';

  if (cellular && (gen === '2g' || gen === '3g')) return VIDEO_PROFILES.low;
  if (cellular && gen === '4g') return VIDEO_PROFILES.medium;
  if (cellular && gen === '5g') return VIDEO_PROFILES.high;
  if (type === 'wifi' || type === 'ethernet') return VIDEO_PROFILES.high;
  if (cellular) return VIDEO_PROFILES.medium;
  return VIDEO_PROFILES.medium;
}

/**
 * Faut‑il forcer le relais TURN (`iceTransportPolicy: 'relay'`) ?
 *
 * TURN configuré → relais obligatoire **natif et web** : le P2P cross-border
 * (Maroc↔Mali) échoue même en Wi‑Fi ; les deux extrémités doivent utiliser Metered.
 */
export function shouldForceTurnRelay(input: {
  turnConfigured: boolean;
  isWeb: boolean;
  net?: NetworkSnapshot | null | undefined;
}): boolean {
  if (!input.turnConfigured) return false;
  return true;
}

function iceServerUrlList(entry: RTCIceServer): string[] {
  const raw = entry.urls;
  if (raw == null) return [];
  return Array.isArray(raw) ? raw.map(String) : [String(raw)];
}

/** Préfère `turns:` + TCP (Android `usesCleartextTraffic: false`). */
export function sortTurnUrlsPreferTls(urls: string[]): string[] {
  const uniq = [...new Set(urls.map(String).filter(Boolean))];
  return uniq.sort((a, b) => {
    const score = (u: string) => {
      const lower = u.toLowerCase();
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

export function hasTurnTlsRelay(iceServers: RTCIceServer[]): boolean {
  for (const entry of iceServers) {
    for (const u of iceServerUrlList(entry)) {
      if (u.toLowerCase().startsWith('turns:')) return true;
    }
  }
  return false;
}

/**
 * NetInfo indisponible : ne pas supposer « cellulaire » (forçait le relais TURN à tort en Wi‑Fi).
 */
export function resolveIceNetworkSnapshot(input: {
  type?: string | null;
  cellularGeneration?: string | null;
} | null | undefined): NetworkSnapshot {
  const type = String(input?.type || '').trim().toLowerCase();
  if (!type || type === 'none') return { type: 'unknown' };
  return {
    type,
    cellularGeneration: input?.cellularGeneration ?? null,
  };
}

/** URL TURN en clair (`turn:`) sans `transport=tcp` → relais UDP (média temps réel). */
function isUdpTurnUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.startsWith('turn:') && !lower.includes('transport=tcp');
}

/**
 * APK Android : `usesCleartextTraffic` est limité au domaine relais Metered via
 * `network_security_config` (plugin `withAndroidTurnCleartext`) — on peut donc
 * réintroduire un relais TURN **UDP** en plus du `turns:` TLS.
 *
 * Ordre des candidats relais (juin 2026, fix vidéo/audio international Maroc↔Mali) :
 *   1. `turn:` UDP — média temps réel, pas de head-of-line blocking (vidéo passe).
 *   2. `turns:` TLS/TCP — repli fiable si l'UDP est bloqué (réseau restrictif).
 *   3. `turn:` TCP en clair — dernier repli.
 * On garde TOUJOURS au moins un `turns:` quand il existe (garde
 * `shouldBlockNativeCellularWithoutTlsTurn`).
 */
export function optimizeIceServersForNativeRelay(iceServers: RTCIceServer[]): RTCIceServer[] {
  if (iceServers.length === 0) return iceServers;

  const stunEntries: RTCIceServer[] = [];
  const turnsUrls: string[] = [];
  const plainTurnUrls: string[] = [];
  let username = '';
  let credential = '';

  for (const entry of iceServers) {
    const urls = iceServerUrlList(entry);
    if (urls.length > 0 && urls.every((u) => u.toLowerCase().startsWith('stun:'))) {
      stunEntries.push(entry);
      continue;
    }
    for (const u of urls) {
      const lower = u.toLowerCase();
      if (lower.startsWith('turns:')) {
        turnsUrls.push(u);
        if (!username && entry.username) username = String(entry.username);
        if (!credential && entry.credential) credential = String(entry.credential);
      } else if (lower.startsWith('turn:')) {
        plainTurnUrls.push(u);
        if (!username && entry.username) username = String(entry.username);
        if (!credential && entry.credential) credential = String(entry.credential);
      }
    }
  }

  const udpTurnUrls = plainTurnUrls.filter(isUdpTurnUrl);
  const tcpPlainTurnUrls = plainTurnUrls.filter((u) => !isUdpTurnUrl(u));
  const chosenTurnUrls = [
    ...new Set([
      ...udpTurnUrls,
      ...sortTurnUrlsPreferTls(turnsUrls),
      ...tcpPlainTurnUrls,
    ]),
  ];
  if (chosenTurnUrls.length === 0 || !username || !credential) {
    return iceServers;
  }

  const out: RTCIceServer[] = stunEntries.slice(0, 3);
  out.push({
    urls: chosenTurnUrls.length === 1 ? chosenTurnUrls[0] : chosenTurnUrls,
    username,
    credential,
  });
  return out;
}

/**
 * Web : ne pas tronquer les entrées TURN (static fallback ~9 entrées, TURN en dernier).
 * Garde toutes les entrées TURN + max `maxStun` STUN — évite `relay` policy sans relais utilisable.
 */
export function prepareIceServersForWeb(
  iceServers: RTCIceServer[],
  maxStun = 3,
): RTCIceServer[] {
  if (iceServers.length === 0) return iceServers;

  const stunEntries: RTCIceServer[] = [];
  const turnEntries: RTCIceServer[] = [];

  for (const entry of iceServers) {
    const urls = iceServerUrlList(entry);
    if (urls.length > 0 && urls.every((u) => u.toLowerCase().startsWith('stun:'))) {
      stunEntries.push(entry);
      continue;
    }
    const hasTurn = urls.some((u) => {
      const lower = u.toLowerCase();
      return lower.startsWith('turn:') || lower.startsWith('turns:');
    });
    if (hasTurn) {
      turnEntries.push(entry);
    } else {
      stunEntries.push(entry);
    }
  }

  return [...stunEntries.slice(0, maxStun), ...turnEntries];
}

/** Prépare les serveurs ICE selon la plateforme (TLS natif, STUN web). */
export function prepareIceServersForPlatform(input: {
  isWeb: boolean;
  turnConfigured: boolean;
  iceServers: RTCIceServer[];
}): RTCIceServer[] {
  if (input.isWeb) {
    return prepareIceServersForWeb(input.iceServers);
  }
  if (!input.turnConfigured) {
    return input.iceServers;
  }
  return optimizeIceServersForNativeRelay(input.iceServers);
}

/** Cellulaire natif + relais TURN obligatoire : exige au moins une URL `turns:`. */
export function shouldBlockNativeCellularWithoutTlsTurn(input: {
  isWeb: boolean;
  turnConfigured: boolean;
  net: NetworkSnapshot | null | undefined;
  iceServers: RTCIceServer[];
}): boolean {
  if (input.isWeb || !input.turnConfigured) return false;
  if (!shouldForceTurnRelay({ turnConfigured: true, isWeb: false, net: input.net })) {
    return false;
  }
  return !hasTurnTlsRelay(input.iceServers);
}

/** Construit la config ICE complète pour `RTCPeerConnection`. */
export function buildCallIceConfig(input: {
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
  isWeb: boolean;
  net: NetworkSnapshot | null | undefined;
}): RTCConfiguration {
  if (input.isWeb) {
    const webConfig: RTCConfiguration = {
      iceServers: prepareIceServersForWeb(input.iceServers),
      iceCandidatePoolSize: CALL_ICE_CANDIDATE_POOL_SIZE,
      bundlePolicy: 'max-bundle' as RTCBundlePolicy,
      rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    };
    if (
      shouldForceTurnRelay({
        turnConfigured: input.turnConfigured,
        isWeb: true,
        net: input.net,
      })
    ) {
      webConfig.iceTransportPolicy = 'relay';
    }
    return webConfig;
  }

  const config: RTCConfiguration = {
    iceServers: prepareIceServersForPlatform({
      isWeb: false,
      turnConfigured: input.turnConfigured,
      iceServers: input.iceServers,
    }),
    iceCandidatePoolSize: CALL_ICE_CANDIDATE_POOL_SIZE,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
  };
  if (
    shouldForceTurnRelay({
      turnConfigured: input.turnConfigured,
      isWeb: input.isWeb,
      net: input.net,
    })
  ) {
    config.iceTransportPolicy = 'relay';
  }
  return config;
}
