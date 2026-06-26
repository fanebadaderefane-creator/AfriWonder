/**
 * Raccrochage Agora DM — survit au démontage React (écran « Appel interrompu »).
 */

type HangupFn = () => Promise<void>;

let activeHangup: { callId: string; run: HangupFn } | null = null;
/** Copie pour ErrorBoundary après crash (activeHangup peut être vidé au unmount). */
let emergencyHangup: { callId: string; run: HangupFn } | null = null;

export function registerAgoraDmCallHangup(callId: string, run: HangupFn): void {
  if (!callId) return;
  activeHangup = { callId, run };
  emergencyHangup = { callId, run };
}

export function clearAgoraDmCallHangup(callId: string): void {
  if (activeHangup?.callId === callId) {
    activeHangup = null;
  }
}

export function clearEmergencyAgoraDmCallHangup(callId?: string): void {
  if (!emergencyHangup) return;
  if (callId && emergencyHangup.callId !== callId) return;
  emergencyHangup = null;
}

export async function requestAgoraDmCallHangup(callId?: string): Promise<boolean> {
  const entry = activeHangup ?? emergencyHangup;
  if (!entry) return false;
  if (callId && entry.callId !== callId) return false;
  activeHangup = null;
  emergencyHangup = null;
  await entry.run();
  return true;
}
