/**
 * Libellés de statut sous le nom du correspondant — logique pure pour tests et écran d’appel.
 */

export type CallUiRole = 'caller' | 'receiver';
export type CallUiState = 'ringing' | 'connecting' | 'connected' | 'ended';
export type CallEndReasonUi = 'completed' | 'failed' | 'missed' | 'declined' | null;

/** Délai affichage « Appel terminé » avant navigation (ms). */
export const CALL_END_STATUS_DISPLAY_MS = 1000;

export function formatCallDurationMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Chronomètre style WhatsApp : `0:04`, `1:23` (sans zéro sur les minutes). */
export function formatCallDurationCompact(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Libellés appel vocal DM — parité WhatsApp (Appel → Appel en cours… → Connexion média… → 0:04). */
export function formatWhatsAppCallStatus(input: {
  callState: CallUiState;
  durationSeconds: number;
  role: CallUiRole;
  errorMsg: string | null;
}): string {
  if (input.callState === 'ended') return 'Appel terminé';
  if (input.callState === 'connected') {
    return formatCallDurationCompact(input.durationSeconds);
  }
  if (input.errorMsg) return input.errorMsg;
  if (input.callState === 'connecting') return 'Connexion média…';
  if (input.callState === 'ringing') {
    if (input.role === 'receiver') return 'Appel entrant…';
    return 'Appel en cours…';
  }
  return 'Appel';
}

/** Statuts écran appel DM Agora natif — parité WhatsApp / Signal. */
export function formatAgoraDmCallStatus(input: {
  callState: CallUiState;
  durationSeconds: number;
  role: CallUiRole;
  errorMsg: string | null;
  endReason?: CallEndReasonUi;
}): string {
  if (input.callState === 'ended' || input.endReason) {
    const reason = input.endReason ?? 'completed';
    if (reason === 'missed') return 'Appel manqué';
    if (reason === 'declined') {
      return input.role === 'caller' ? 'Appel annulé' : 'Appel refusé';
    }
    if (reason === 'failed' && input.errorMsg) return input.errorMsg;
    return 'Appel terminé';
  }
  if (input.callState === 'connected') {
    return formatCallDurationCompact(input.durationSeconds);
  }
  if (input.errorMsg) return input.errorMsg;
  if (input.callState === 'connecting') return 'Connexion média…';
  if (input.callState === 'ringing') {
    if (input.role === 'receiver') return 'Sonnerie…';
    return 'Appel en cours…';
  }
  return 'Appel en cours…';
}

export function formatCallStatusLine(input: {
  hasWebRtcSupport: boolean;
  errorMsg: string | null;
  callState: CallUiState;
  durationSeconds: number;
  role: CallUiRole;
  /** Correspondant en ligne (socket / API présence). `null` = inconnu → traité comme hors ligne. */
  peerOnline: boolean | null;
  /** `true` dès que le correspondant a décroché (accept). */
  answered: boolean;
}): string {
  if (!input.hasWebRtcSupport) {
    return 'Appel indisponible sur cet appareil.';
  }
  if (input.callState === 'ended') return 'Appel terminé';

  /** Chronomètre uniquement quand le média WebRTC est établi — pas au simple « décrochage » socket. */
  if (input.callState === 'connected') {
    return formatCallDurationMmSs(input.durationSeconds);
  }

  if (input.errorMsg) return input.errorMsg;

  if (input.answered && input.callState === 'connecting') {
    return 'Connexion média…';
  }

  if (input.callState === 'ringing') {
    if (input.role === 'receiver') return 'Appel entrant…';
    return input.peerOnline === true ? 'Appel en cours…' : 'Appel';
  }

  if (input.callState === 'connecting') {
    if (input.role === 'receiver') return 'Connexion média…';
    return input.peerOnline === true ? 'Appel en cours…' : 'Appel';
  }

  return 'Appel';
}
