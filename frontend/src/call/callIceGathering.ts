/**
 * Half-trickle ICE — embarquer les candidats (surtout `relay`/TURN) DANS le SDP.
 *
 * Contexte (juin 2026, Maroc↔Mali) : le SDP offer/answer est livré de façon
 * fiable (`ensureConnectedEmit` attend + ré-essaie), mais les candidats ICE en
 * trickle arrivent en rafale < 1 s et peuvent être 100 % perdus sur un blip
 * radio cellulaire → aucune paire ICE → DTLS bloqué `new` → aucun média.
 *
 * Solution : avant d'émettre le SDP, attendre un court instant borné que le
 * `localDescription` contienne au moins un candidat `relay`. Comme le SDP est
 * livré de façon fiable, la connexion peut s'établir MÊME si tout le trickle est
 * perdu. Le trickle continue en parallèle (rien n'est retiré).
 *
 * Ce module est PUR (aucune dépendance WebRTC) pour rester testable.
 */

export type SdpCandidateCounts = {
  host: number;
  srflx: number;
  relay: number;
  prflx: number;
  total: number;
};

/** Compte les candidats par type présents dans un SDP (lignes `a=candidate:… typ X`). */
export function sdpCandidateCounts(sdp: string | null | undefined): SdpCandidateCounts {
  const counts: SdpCandidateCounts = { host: 0, srflx: 0, relay: 0, prflx: 0, total: 0 };
  const body = String(sdp || '');
  if (!body) return counts;
  const regex = /a=candidate:[^\r\n]*?\btyp\s+(host|srflx|relay|prflx)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    const type = match[1].toLowerCase() as 'host' | 'srflx' | 'relay' | 'prflx';
    counts[type] += 1;
    counts.total += 1;
  }
  return counts;
}

export type IceGatheringWaitDecision = {
  /** Arrêter d'attendre et émettre le SDP maintenant. */
  done: boolean;
  /** Raison (diagnostic / log). */
  reason: 'gathering_complete' | 'relay_ready' | 'timeout' | 'waiting';
};

export type IceGatheringWaitInput = {
  iceGatheringState: string | null | undefined;
  sdp: string | null | undefined;
  elapsedMs: number;
  /** Plafond d'attente — au-delà on émet ce qu'on a (ne jamais bloquer l'appel). */
  maxWaitMs: number;
  /**
   * Si `true`, on attend spécifiquement un candidat `relay`. Sinon, n'importe
   * quel candidat suffit (réseaux où le host suffit, ex. même LAN).
   */
  requireRelay?: boolean;
};

/**
 * Décide s'il faut cesser d'attendre les candidats ICE avant d'émettre le SDP.
 *
 * On s'arrête dès que :
 *  - le gathering est terminé (`complete`) — tous les candidats sont déjà là ;
 *  - un candidat `relay` est présent (cas Maroc↔Mali : c'est lui qui connecte) ;
 *  - le plafond `maxWaitMs` est atteint (filet : on n'empêche jamais l'appel).
 */
export function decideIceGatheringWait(input: IceGatheringWaitInput): IceGatheringWaitDecision {
  const counts = sdpCandidateCounts(input.sdp);
  return decideIceGatheringWaitFromCounts(input, counts);
}

/** Variante testable — décision depuis des comptes déjà agrégés (SDP + buffer onicecandidate). */
export function decideIceGatheringWaitFromCounts(
  input: IceGatheringWaitInput,
  counts: SdpCandidateCounts,
): IceGatheringWaitDecision {
  const state = String(input.iceGatheringState || '');
  const hasRelay = counts.relay > 0;
  const hasAny = counts.total > 0;
  const requireRelay = input.requireRelay !== false;

  if (hasRelay) {
    return { done: true, reason: 'relay_ready' };
  }

  if (input.elapsedMs >= input.maxWaitMs) {
    return { done: true, reason: 'timeout' };
  }

  /** LAN / host-only : gathering terminé — émettre même sans relay. */
  if (state === 'complete' && !requireRelay) {
    return { done: true, reason: 'gathering_complete' };
  }

  if (!requireRelay && hasAny) {
    return { done: true, reason: 'relay_ready' };
  }

  return { done: false, reason: 'waiting' };
}
