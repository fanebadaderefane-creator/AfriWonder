/**
 * Logs diagnostic barre de contrôles appel — régression UI (juin 2026).
 */

function serialize(meta?: Record<string, unknown>): string {
  return JSON.stringify({ ts: Date.now(), ...meta });
}

export function logCallControlsMounted(meta?: Record<string, unknown>): void {
  console.error('[CALL_CONTROLS]', 'mounted', serialize(meta));
}

export function logCallControlsVisible(meta?: Record<string, unknown>): void {
  console.error('[CALL_CONTROLS]', 'visible', serialize(meta));
}

export function logCallControlsHidden(meta?: Record<string, unknown>): void {
  console.error('[CALL_CONTROLS]', 'hidden', serialize(meta));
}

export function logCallControlsUnmounted(meta?: Record<string, unknown>): void {
  console.error('[CALL_CONTROLS]', 'unmounted', serialize(meta));
}
