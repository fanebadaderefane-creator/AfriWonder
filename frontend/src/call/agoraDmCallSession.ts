/**
 * Règles session appel DM Agora — logique pure (tests + écran d'appel).
 */

export function resolveAgoraDmCallId(input: {
  role: 'caller' | 'receiver';
  routeCallId: string;
  newCallId: () => string;
}): { callId: string; error: string | null } {
  const routeCallId = String(input.routeCallId || '').trim();
  if (input.role === 'receiver') {
    if (!routeCallId) {
      return { callId: '', error: 'Appel invalide — identifiant manquant.' };
    }
    return { callId: routeCallId, error: null };
  }
  return { callId: routeCallId || input.newCallId(), error: null };
}

/** InCallManager / expo-av ne doivent pas rester actifs pendant join Agora (silence mutuel). */
export function shouldStartNativeInCallBeforeAgora(role: 'caller' | 'receiver'): boolean {
  return role === 'caller';
}
