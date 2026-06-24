import type { IRtcEngine } from 'react-native-agora';

/** Appel méthode moteur Agora — ignore si absente (SDK / version). */
export function invokeAgoraEngine(
  engine: IRtcEngine | null | undefined,
  method: string,
  ...args: unknown[]
): void {
  if (!engine) return;
  const fn = (engine as unknown as Record<string, unknown>)[method];
  if (typeof fn !== 'function') return;
  try {
    fn.apply(engine, args);
  } catch {
    /* ignore */
  }
}
