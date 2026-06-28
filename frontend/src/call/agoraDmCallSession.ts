/**
 * Règles session appel DM Agora — logique pure (tests + écran d'appel).
 */

export function resolveAgoraDmCallId(input: {
  role: 'caller' | 'receiver';
  routeCallId: string;
  newCallId: () => string;
  /** Canal Agora encore actif après crash ErrorBoundary — réutiliser, pas de nouvel invite. */
  preserveActiveCallId?: string | null;
}): { callId: string; error: string | null } {
  const routeCallId = String(input.routeCallId || '').trim();
  const preserveActiveCallId = String(input.preserveActiveCallId || '').trim();
  if (input.role === 'receiver') {
    if (!routeCallId) {
      return { callId: '', error: 'Appel invalide — identifiant manquant.' };
    }
    return { callId: routeCallId, error: null };
  }
  if (routeCallId) return { callId: routeCallId, error: null };
  if (preserveActiveCallId) return { callId: preserveActiveCallId, error: null };
  return { callId: input.newCallId(), error: null };
}

/** InCallManager / expo-av ne doivent pas rester actifs pendant join Agora (silence mutuel). */
export function shouldStartNativeInCallBeforeAgora(role: 'caller' | 'receiver'): boolean {
  return role === 'caller';
}

/** Receveur — session audio native après `onJoinChannelSuccess` (Android route HP/écouteur). */
export function shouldEnsureNativeInCallAfterAgoraJoin(role: 'caller' | 'receiver'): boolean {
  return role === 'receiver';
}
