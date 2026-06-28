import { logAfwCall } from './callDiagnosticLog';

/** Trace effet React — log sans rethrow (évite cascade ErrorBoundary post agora_join_ok). */
export function runCallScreenSafeEffect(effectName: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    logAfwCall('call_screen_effect_error', {
      effect: effectName,
      error: String((error as Error)?.message ?? error),
    });
  }
}
