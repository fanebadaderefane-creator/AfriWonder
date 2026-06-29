/** Garde sync canvas — logique pure (testable sans moteur Agora natif). */
export function shouldSyncAgoraDmLocalPreviewCanvas(input: {
  active: boolean;
  callId: string;
  activeChannelCallId: string | null;
  previewEngineAlive?: boolean;
}): boolean {
  if (!input.active || !input.callId) return false;
  if (input.activeChannelCallId === input.callId) return true;
  return Boolean(input.previewEngineAlive);
}
