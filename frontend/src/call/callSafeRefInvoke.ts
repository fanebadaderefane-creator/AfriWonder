import { logAfwCall } from './callDiagnosticLog';

/** Appelle une ref stop/cleanup seulement si c'est une fonction — évite `undefined is not a function`. */
export async function safeInvokeAsyncRef(
  ref: { current: unknown },
  meta?: Record<string, unknown>,
): Promise<void> {
  const fn = ref.current;
  ref.current = null;
  if (typeof fn !== 'function') return;
  try {
    await fn();
  } catch (error) {
    logAfwCall('call_ref_invoke_failed', {
      ...meta,
      error: String((error as Error)?.message ?? error),
    });
  }
}

export function safeInvokeSyncRef(
  ref: { current: unknown },
  meta?: Record<string, unknown>,
): void {
  const fn = ref.current;
  if (typeof fn !== 'function') return;
  try {
    fn();
  } catch (error) {
    logAfwCall('call_ref_invoke_failed', {
      ...meta,
      error: String((error as Error)?.message ?? error),
    });
  }
}
