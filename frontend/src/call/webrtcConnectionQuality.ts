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
