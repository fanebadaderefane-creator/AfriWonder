import { stopEveryCallRingAlert } from './callRingStop';
import { useAgoraDmCallUiStore } from './agoraDmCallUiStore';
import { logAfwCall } from './callDiagnosticLog';

/** Web — pas d’Agora natif ; nettoie UI + sonneries seulement. */
export async function forceAgoraDmCallHangup(reason: string): Promise<void> {
  logAfwCall('agora_force_hangup', { reason, platform: 'web' });
  await stopEveryCallRingAlert();
  useAgoraDmCallUiStore.getState().clearSession();
}
