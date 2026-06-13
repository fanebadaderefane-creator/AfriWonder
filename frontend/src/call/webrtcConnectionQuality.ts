/**
 * Interprète un RTCStatsReport (ou Map itérable) pour un libellé « type WhatsApp ».
 * Heuristique : candidate-pair (RTT) + inbound-rtp (perte).
 */

export type ConnectionQuality = 'good' | 'fair' | 'poor';

export type ConnectionQualityDisplay = {
  quality: ConnectionQuality;
  labelFr: string;
  bars: 1 | 2 | 3;
};

function rttMsFromCandidatePair(r: Record<string, unknown>): number | null {
  const cur = r.currentRoundTripTime;
  const tot = r.totalRoundTripTime;
  if (typeof cur === 'number' && cur > 0) {
    return cur >= 1 ? cur : cur * 1000;
  }
  if (typeof tot === 'number' && tot > 0) {
    return tot >= 1 ? tot : tot * 1000;
  }
  return null;
}

/**
 * @param report — résultat de `await pc.getStats()` (navigateur / RN-webrtc).
 */
export function connectionQualityFromRtcStatsReport(report: unknown): ConnectionQualityDisplay {
  let bestRtt: number | null = null;
  let maxFractionLost = 0;

  try {
    const r = report as {
      values?: () => IterableIterator<Record<string, unknown>>;
      forEach?: (fn: (report: Record<string, unknown>) => void) => void;
    };
    let rows: Record<string, unknown>[] | null = null;
    if (typeof r?.values === 'function') {
      rows = Array.from(r.values());
    } else if (typeof r?.forEach === 'function') {
      rows = [];
      r.forEach((entry) => rows!.push(entry));
    }
    if (!rows?.length) {
      return { quality: 'fair', labelFr: 'Connexion…', bars: 2 };
    }
    for (const raw of rows) {
      const r = raw as Record<string, unknown>;
      const type = r.type;
      if (type === 'candidate-pair' && r.state === 'succeeded') {
        const ms = rttMsFromCandidatePair(r);
        if (ms != null && ms > 0) {
          bestRtt = bestRtt == null ? ms : Math.min(bestRtt, ms);
        }
      }
      if (type === 'remote-inbound-rtp' || type === 'inbound-rtp') {
        const fl = r.fractionLost;
        if (typeof fl === 'number' && fl >= 0 && fl <= 1) {
          maxFractionLost = Math.max(maxFractionLost, fl);
        }
      }
    }
  } catch {
    return { quality: 'fair', labelFr: 'Connexion…', bars: 2 };
  }

  const rttOk = bestRtt != null && bestRtt < 220;
  const rttFair = bestRtt != null && bestRtt < 450;
  const lossOk = maxFractionLost < 0.04;
  const lossFair = maxFractionLost < 0.12;

  if (bestRtt == null && maxFractionLost === 0) {
    return { quality: 'fair', labelFr: 'Connexion…', bars: 2 };
  }

  if (rttOk && lossOk) {
    return { quality: 'good', labelFr: 'Bonne connexion', bars: 3 };
  }
  if ((rttFair || bestRtt == null) && lossFair) {
    return { quality: 'fair', labelFr: 'Connexion moyenne', bars: 2 };
  }
  return { quality: 'poor', labelFr: 'Connexion faible', bars: 1 };
}

export type IceSelectedCandidateSummary = {
  localType: string | null;
  remoteType: string | null;
  protocol: string | null;
  relayUsed: boolean;
};

/** Extrait le type de candidat sélectionné (host/srflx/relay) depuis getStats(). */
export function iceSelectedCandidateFromRtcStatsReport(report: unknown): IceSelectedCandidateSummary {
  let localType: string | null = null;
  let remoteType: string | null = null;
  let protocol: string | null = null;
  try {
    const r = report as {
      values?: () => IterableIterator<Record<string, unknown>>;
      forEach?: (fn: (report: Record<string, unknown>) => void) => void;
    };
    let rows: Record<string, unknown>[] | null = null;
    if (typeof r?.values === 'function') {
      rows = Array.from(r.values());
    } else if (typeof r?.forEach === 'function') {
      rows = [];
      r.forEach((entry) => rows!.push(entry));
    }
    if (!rows?.length) {
      return { localType: null, remoteType: null, protocol: null, relayUsed: false };
    }
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const id = String(row.id || '');
      if (id) byId.set(id, row);
    }
    for (const row of rows) {
      if (row.type !== 'candidate-pair' || row.state !== 'succeeded') continue;
      const local = byId.get(String(row.localCandidateId || ''));
      const remote = byId.get(String(row.remoteCandidateId || ''));
      localType = String(local?.candidateType || localType || '') || null;
      remoteType = String(remote?.candidateType || remoteType || '') || null;
      protocol = String(local?.protocol || protocol || '') || null;
      break;
    }
  } catch {
    /* ignore */
  }
  const relayUsed = localType === 'relay' || remoteType === 'relay';
  return { localType, remoteType, protocol, relayUsed };
}

export type RtpDirectionKindStats = {
  kind: 'audio' | 'video';
  packetsReceived: number;
  bytesReceived: number;
  packetsSent: number;
  bytesSent: number;
  /** Vidéo entrante uniquement — 0 si absent ou audio. */
  framesDecoded: number;
};

export type RtpMediaStatsSummary = {
  audio: RtpDirectionKindStats | null;
  video: RtpDirectionKindStats | null;
};

function readRtcStatsRows(report: unknown): Record<string, unknown>[] {
  const r = report as {
    values?: () => IterableIterator<Record<string, unknown>>;
    forEach?: (fn: (report: Record<string, unknown>) => void) => void;
  };
  if (typeof r?.values === 'function') {
    return Array.from(r.values());
  }
  if (typeof r?.forEach === 'function') {
    const rows: Record<string, unknown>[] = [];
    r.forEach((entry) => rows.push(entry));
    return rows;
  }
  return [];
}

function asNonNegativeInt(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function mediaKindFromRow(row: Record<string, unknown>): 'audio' | 'video' | null {
  const kind = String(row.kind || row.mediaType || '').toLowerCase();
  if (kind === 'audio' || kind === 'video') return kind;
  return null;
}

function emptyKindStats(kind: 'audio' | 'video'): RtpDirectionKindStats {
  return {
    kind,
    packetsReceived: 0,
    bytesReceived: 0,
    packetsSent: 0,
    bytesSent: 0,
    framesDecoded: 0,
  };
}

/**
 * Agrège inbound-rtp / outbound-rtp par kind — preuve RTP en prod (Logcat).
 * Prend le max par champ si plusieurs entrées du même kind (redondance navigateur).
 */
export function rtpMediaStatsFromRtcStatsReport(report: unknown): RtpMediaStatsSummary {
  const acc: Record<'audio' | 'video', RtpDirectionKindStats> = {
    audio: emptyKindStats('audio'),
    video: emptyKindStats('video'),
  };
  let sawAudio = false;
  let sawVideo = false;

  try {
    for (const row of readRtcStatsRows(report)) {
      const kind = mediaKindFromRow(row);
      if (!kind) continue;
      const type = String(row.type || '');
      const slot = acc[kind];
      if (type === 'inbound-rtp') {
        sawAudio = sawAudio || kind === 'audio';
        sawVideo = sawVideo || kind === 'video';
        slot.packetsReceived = Math.max(slot.packetsReceived, asNonNegativeInt(row.packetsReceived));
        slot.bytesReceived = Math.max(slot.bytesReceived, asNonNegativeInt(row.bytesReceived));
        if (kind === 'video') {
          slot.framesDecoded = Math.max(slot.framesDecoded, asNonNegativeInt(row.framesDecoded));
        }
      } else if (type === 'outbound-rtp') {
        sawAudio = sawAudio || kind === 'audio';
        sawVideo = sawVideo || kind === 'video';
        slot.packetsSent = Math.max(slot.packetsSent, asNonNegativeInt(row.packetsSent));
        slot.bytesSent = Math.max(slot.bytesSent, asNonNegativeInt(row.bytesSent));
      }
    }
  } catch {
    return { audio: null, video: null };
  }

  return {
    audio: sawAudio ? acc.audio : null,
    video: sawVideo ? acc.video : null,
  };
}
