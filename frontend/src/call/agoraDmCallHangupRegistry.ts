/**
 * Raccrochage Agora DM — survit au démontage React (écran « Appel interrompu »).
 */

type HangupFn = () => Promise<void>;

let activeHangup: { callId: string; run: HangupFn } | null = null;

export function registerAgoraDmCallHangup(callId: string, run: HangupFn): void {
  if (!callId) return;
  activeHangup = { callId, run };
}

export function clearAgoraDmCallHangup(callId: string): void {
  if (activeHangup?.callId === callId) {
    activeHangup = null;
  }
}

export async function requestAgoraDmCallHangup(callId?: string): Promise<boolean> {
  const entry = activeHangup;
  if (!entry) return false;
  if (callId && entry.callId !== callId) return false;
  activeHangup = null;
  await entry.run();
  return true;
}
