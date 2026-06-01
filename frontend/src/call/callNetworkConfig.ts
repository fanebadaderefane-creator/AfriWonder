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
 * - Web : jamais (le navigateur gère bien le P2P + relais auto).
 * - Mobile + TURN configuré + **cellulaire** : OUI — sur CGNAT mobile, tenter le direct
 *   gaspille un temps précieux (et de la data 2G/3G) avant de retomber sur TURN.
 * - Mobile + TURN configuré + Wi‑Fi : non (le direct fonctionne, TURN reste candidat de secours).
 * - TURN non configuré : impossible de forcer le relais (aucun relais disponible).
 */
export function shouldForceTurnRelay(input: {
  turnConfigured: boolean;
  isWeb: boolean;
  net: NetworkSnapshot | null | undefined;
}): boolean {
  if (input.isWeb) return false;
  if (!input.turnConfigured) return false;
  return isCellularNetwork(input.net);
}

/** Construit la config ICE complète pour `RTCPeerConnection`. */
export function buildCallIceConfig(input: {
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
  isWeb: boolean;
  net: NetworkSnapshot | null | undefined;
}): RTCConfiguration {
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
