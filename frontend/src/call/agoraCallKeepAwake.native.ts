import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { logAfwCall } from './callDiagnosticLog';

const KEEP_AWAKE_TAG = 'afw-agora-dm-call';

export async function enableCallKeepAwake(meta?: Record<string, unknown>): Promise<void> {
  if (typeof activateKeepAwakeAsync !== 'function') return;
  try {
    await activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    logAfwCall('KEEP_SCREEN_ON_ENABLED', meta);
  } catch {
    /* Expo Go / OEM — keep-awake parfois indisponible */
  }
}

export function disableCallKeepAwake(meta?: Record<string, unknown>): void {
  if (typeof deactivateKeepAwake !== 'function') return;
  try {
    deactivateKeepAwake(KEEP_AWAKE_TAG);
    logAfwCall('KEEP_SCREEN_ON_DISABLED', meta);
  } catch {
    /* ignore */
  }
}
