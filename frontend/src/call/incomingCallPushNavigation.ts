import { router } from 'expo-router';

function readStr(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * Ouvre l’écran d’appel en réponse à une notification push `call_incoming`
 * (app fermée, arrière-plan, ou premier plan).
 */
export function navigateToIncomingCallFromPush(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  if (readStr(data.type) !== 'call_incoming') return false;

  const callId = readStr(data.callId) || readStr(data.reference_id);
  const callerId = readStr(data.callerId);
  if (!callId || !callerId) return false;

  const rawMedia = readStr(data.callMediaType).toLowerCase();
  const isVideo = rawMedia === 'video';

  router.push({
    pathname: '/messages/call',
    params: {
      name: readStr(data.callerName) || 'Contact',
      avatar: readStr(data.callerAvatar),
      type: isVideo ? 'video' : 'audio',
      callType: isVideo ? 'video' : 'audio',
      otherUserId: callerId,
      role: 'receiver',
      callId,
    },
  });
  return true;
}
