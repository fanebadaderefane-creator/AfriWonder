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
}): string {
  if (!input.hasWebRtcSupport) {
    return 'Appel indisponible sur cet appareil.';
  }
  if (input.errorMsg) return input.errorMsg;
  if (input.callState === 'ringing') {
    return input.role === 'caller' ? 'Sonnerie…' : 'Appel entrant…';
  }
  if (input.callState === 'connecting') return 'Appel en cours…';
  if (input.callState === 'connected') {
    return `Appel en cours · ${formatCallDurationMmSs(input.durationSeconds)}`;
  }
  return 'Appel terminé';
}
