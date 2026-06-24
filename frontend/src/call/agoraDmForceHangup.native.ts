import { stopEveryCallRingAlert } from './callRingtone';
import { releaseAgoraDmPreviewSession } from './agoraDmPreviewSession.native';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';
import { logAfwCall } from './callDiagnosticLog';

/** Coupe média + UI quand l’écran d’appel est déjà démonté (fallback ErrorBoundary). */
export async function forceAgoraDmCallHangup(reason: string): Promise<void> {
  logAfwCall('agora_force_hangup', { reason });
  await stopEveryCallRingAlert();
  await releaseAgoraDmPreviewSession(reason);
  useAgoraDmCallUiStore.getState().clearSession();
}
