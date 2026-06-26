import apiClient from '../api/client';
import socketService from '../services/socketService';
import { stopActiveCallForeground } from '../services/incomingCallService';
import { useAuthStore } from '../store/authStore';
import { forceLeaveAgoraDmActiveChannel } from './agoraDmActiveChannel';
import { clearEmergencyAgoraDmCallHangup } from './agoraDmCallHangupRegistry';
import { releaseAgoraDmPreviewSession } from './agoraDmPreviewSession.native';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';
import { logAfwCall } from './callDiagnosticLog';
import { stopEveryCallRingAlert } from './callRingStop';

/** Coupe média + UI quand l’écran d’appel est déjà démonté (fallback ErrorBoundary). */
export async function forceAgoraDmCallHangup(reason: string): Promise<void> {
  const snap = useAgoraDmCallUiStore.getState();
  const callId = snap.callId;
  const myUserId = String(useAuthStore.getState().user?.id || '');
  logAfwCall('agora_force_hangup', { reason, callId: callId || null });

  await stopEveryCallRingAlert();
  await forceLeaveAgoraDmActiveChannel(reason);
  await releaseAgoraDmPreviewSession(reason);
  await stopActiveCallForeground().catch(() => {});

  if (callId && snap.otherUserId && myUserId) {
    await apiClient
      .post(`/calls/${encodeURIComponent(callId)}/session-state`, {
        status: 'failed',
        duration: snap.durationSeconds ?? 0,
      })
      .catch(() => {});
    await socketService
      .ensureConnectedEmit('call:end', {
        callId,
        fromUserId: myUserId,
        toUserId: snap.otherUserId,
        reason: 'failed',
        durationSec: snap.durationSeconds ?? 0,
      })
      .catch(() => {});
  }

  clearEmergencyAgoraDmCallHangup(callId || undefined);
  useAgoraDmCallUiStore.getState().clearSession();
}
