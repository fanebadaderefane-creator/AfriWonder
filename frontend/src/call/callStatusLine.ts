/**
 * Libellés de statut sous le nom du correspondant — logique pure pour tests et écran d’appel.
 */

export type CallUiRole = 'caller' | 'receiver';
export type CallUiState = 'ringing' | 'connecting' | 'connected' | 'ended';

export function formatCallDurationMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  if (input.errorMsg) return input.errorMsg;
  if (input.callState === 'ended') return 'Appel terminé';

  /** Chronomètre uniquement quand le média WebRTC est établi — pas au simple « décrochage » socket. */
  if (input.callState === 'connected') {
    return formatCallDurationMmSs(input.durationSeconds);
  }

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
