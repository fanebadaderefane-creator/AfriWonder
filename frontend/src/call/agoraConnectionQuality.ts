import type { ConnectionQualityDisplay } from './webrtcConnectionQuality';

/** Agora NetworkQuality : 0=inconnu, 1=excellent, 2=bon, 3=moyen, 4=faible, 5=très faible, 6=coupé. */
export function connectionQualityFromAgoraNetwork(
  rxQuality: number,
  txQuality: number,
): ConnectionQualityDisplay {
  const rx = Number.isFinite(rxQuality) ? rxQuality : 0;
  const tx = Number.isFinite(txQuality) ? txQuality : 0;
  const worst = Math.max(rx, tx);
  if (worst === 0) {
    return { quality: 'fair', labelFr: 'Connexion…', bars: 2 };
  }
  if (worst <= 2) {
    return { quality: 'good', labelFr: 'Bonne connexion', bars: 3 };
  }
  if (worst <= 4) {
    return { quality: 'fair', labelFr: 'Connexion moyenne', bars: 2 };
  }
  return { quality: 'poor', labelFr: 'Connexion faible', bars: 1 };
}
