/** Logique pure handoff preview Agora DM (overlay entrant → écran d’appel). */

export type AgoraPreviewSessionRef = {
  callId: string;
  previewActive: boolean;
} | null;

/** Ne pas libérer le moteur quand l’acceptation est en cours de transfert. */
export function shouldBlockPreviewSessionRelease(
  session: AgoraPreviewSessionRef,
  handoffCallId: string | null,
): boolean {
  if (!session || !handoffCallId) return false;
  return session.callId === handoffCallId;
}

export function canMarkPreviewHandoff(callId: string, sessionCallId: string | null): boolean {
  return !!callId && sessionCallId === callId;
}

export function canConsumePreviewEngine(callId: string, sessionCallId: string | null): boolean {
  return !!callId && sessionCallId === callId;
}
