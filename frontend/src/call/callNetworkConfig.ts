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

/** Watchdog « connexion média » — TURN + 2G/3G nécessitent plus de temps qu’en Wi‑Fi. */
export function callConnectionWatchdogMs(net: NetworkSnapshot | null | undefined): number {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') return 90_000;
  if (isCellularNetwork(net) && gen === '3g') return 75_000;
  return 60_000;
}

/** Délai avant message « connexion lente » après acceptation. */
export function callMediaReadyHintMs(net: NetworkSnapshot | null | undefined): number {
  const gen = String(net?.cellularGeneration || '').toLowerCase();
  if (isCellularNetwork(net) && gen === '2g') return 35_000;
  if (isCellularNetwork(net) && gen === '3g') return 28_000;
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

/** Sans TURN, le cellulaire Afrique (CGNAT) ne passe presque jamais l’audio — web inclus. */
export function shouldBlockCellularWithoutTurn(input: {
  turnConfigured: boolean;
  net: NetworkSnapshot | null | undefined;
}): boolean {
  if (input.turnConfigured) return false;
  return isCellularNetwork(input.net);
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
 * **Natif** : relais obligatoire si TURN configuré (CGNAT opérateurs Afrique).
 * **Web Wi‑Fi** : ICE direct + STUN (dev local / Firefox).
 * **Web cellulaire** : relais TURN si configuré (même contrainte CGNAT qu’en natif).
 */
export function shouldForceTurnRelay(input: {
  turnConfigured: boolean;
  isWeb: boolean;
  net?: NetworkSnapshot | null | undefined;
}): boolean {
  if (!input.turnConfigured) return false;
  if (!input.isWeb) return true;
  return isCellularNetwork(input.net);
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
      iceServers: input.iceServers.slice(0, 4),
      iceCandidatePoolSize: 4,
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
    iceServers: input.iceServers,
    iceCandidatePoolSize: 8,
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
