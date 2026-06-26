/**
 * Cycle de vie join canal Agora DM — logique pure (tests + hook RTC).
 */

/** Ne pas resynchroniser callId si le serveur confirme le même identifiant (évite reset join/bootstrap). */
export function shouldApplyInviteAckCallId(currentCallId: string, ackCallId: string): boolean {
  const cur = String(currentCallId || '').trim();
  const ack = String(ackCallId || '').trim();
  return !!ack && ack !== cur;
}

/** Ne pas stopPreview avant joinChannel — preview adopté reste actif (régression Android juin 2026). */
export function shouldStopPreviewBeforeChannelJoin(_adoptedPreview: boolean): boolean {
  return false;
}

export const AGORA_JOIN_OK_WATCHDOG_MS = 8_000;
