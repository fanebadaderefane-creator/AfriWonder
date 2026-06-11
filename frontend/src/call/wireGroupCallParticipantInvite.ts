import socketService from '../services/socketService';
import { safeRouterPush } from '../utils/safeRouter';

type ParticipantInvitePayload = {
  groupCallId?: string;
  type?: 'audio' | 'video';
  inviterName?: string;
};

/** Écoute les invitations à rejoindre un appel groupe (3e participant et +). */
export function wireGroupCallParticipantInvite(): () => void {
  return socketService.on('call:participant-invite', (payload: ParticipantInvitePayload) => {
    const groupCallId = String(payload?.groupCallId || '').trim();
    if (!groupCallId) return;
    const callType = payload?.type === 'video' ? 'video' : 'audio';
    void safeRouterPush({
      pathname: '/messages/group-call',
      params: { callId: groupCallId, type: callType },
    });
  });
}
