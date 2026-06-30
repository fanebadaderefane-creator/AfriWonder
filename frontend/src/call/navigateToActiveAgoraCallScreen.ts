import { router } from 'expo-router';
import { refreshAgoraDmLocalPreviewCanvas } from './agoraDmLocalPreviewCanvas';
import { resolveAgoraDmResumeCallNavigation } from './agoraDmResumeCallNavigation';
import { logCallNav } from './callUiLifecycleLog';
import { logAfwCall } from './callDiagnosticLog';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';

function buildCallRouteParams(s: ReturnType<typeof useAgoraDmCallUiStore.getState>) {
  return {
    callId: s.callId,
    peerId: s.otherUserId,
    otherUserId: s.otherUserId,
    peerName: s.peerName,
    name: s.peerName,
    peerAvatar: s.peerAvatar,
    avatar: s.peerAvatar,
    callType: s.isVideoCall ? 'video' : 'audio',
    type: s.isVideoCall ? 'video' : 'audio',
    role: s.role,
    sessionNonce: String(Date.now()),
  };
}

function afterResumeNavigation(): void {
  queueMicrotask(() => refreshAgoraDmLocalPreviewCanvas('resume_call'));
}

/** Rouvre l'écran d'appel actif (style WhatsApp). */
export function navigateToActiveAgoraCallScreen(): void {
  const s = useAgoraDmCallUiStore.getState();
  if (!s.active || !s.callId) return;
  const wasMinimized = s.minimized;
  s.setMinimized(false);
  const canGoBack = typeof router.canGoBack === 'function' && router.canGoBack();
  const navAction = resolveAgoraDmResumeCallNavigation({ wasMinimized, canGoBack });
  logCallNav('messages/call', {
    action: 'resume_from_minimize',
    callId: s.callId,
    wasMinimized,
    navAction,
  });
  logAfwCall('NAVIGATION', {
    action: 'resume_active_call',
    callId: s.callId,
    navAction,
    wasMinimized,
  });
  if (navAction === 'router_back') {
    router.back();
    afterResumeNavigation();
    return;
  }
  router.push({
    pathname: '/messages/call',
    params: buildCallRouteParams(s),
  } as never);
  afterResumeNavigation();
}
