/** Dedup `call:accept` socket (double émission réseau / double handler). */
const handledCallIds = new Set<string>();

export function shouldHandleAgoraPeerAccept(callId: string): boolean {
  const key = String(callId || '').trim();
  if (!key) return false;
  if (handledCallIds.has(key)) return false;
  handledCallIds.add(key);
  return true;
}

export function clearAgoraPeerAcceptDedup(callId: string): void {
  const key = String(callId || '').trim();
  if (key) handledCallIds.delete(key);
}

export function resetAgoraPeerAcceptDedupForTests(): void {
  handledCallIds.clear();
}
