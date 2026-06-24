/**
 * Logs cycle de vie UI appel vidéo — indépendants de EXPO_PUBLIC_CALL_DEBUG.
 * Tags demandés audit régression juin 2026.
 */

function serialize(meta?: Record<string, unknown>): string {
  return JSON.stringify({ ts: Date.now(), ...meta });
}

export function logVideoScreenMount(meta?: Record<string, unknown>): void {
  console.error('[VIDEO_SCREEN_MOUNT]', serialize(meta));
}

export function logVideoScreenUnmount(meta?: Record<string, unknown>): void {
  console.error('[VIDEO_SCREEN_UNMOUNT]', serialize(meta));
}

export function logCallUiVisible(meta?: Record<string, unknown>): void {
  console.error('[CALL_UI_VISIBLE]', serialize(meta));
}

export function logCallUiHidden(meta?: Record<string, unknown>): void {
  console.error('[CALL_UI_HIDDEN]', serialize(meta));
}

export function logAndroidBackPressed(meta?: Record<string, unknown>): void {
  console.error('[ANDROID_BACK_PRESSED]', serialize(meta));
}

export function logAppStateActive(meta?: Record<string, unknown>): void {
  console.error('[APPSTATE_ACTIVE]', serialize(meta));
}

export function logAppStateBackground(meta?: Record<string, unknown>): void {
  console.error('[APPSTATE_BACKGROUND]', serialize(meta));
}

export function logAppStateInactive(meta?: Record<string, unknown>): void {
  console.error('[APPSTATE_INACTIVE]', serialize(meta));
}

export function logNavigationFocus(meta?: Record<string, unknown>): void {
  console.error('[NAVIGATION_FOCUS]', serialize(meta));
}

export function logNavigationBlur(meta?: Record<string, unknown>): void {
  console.error('[NAVIGATION_BLUR]', serialize(meta));
}

export function logLocalStreamCreated(meta?: Record<string, unknown>): void {
  console.error('[LOCAL_STREAM_CREATED]', serialize(meta));
}

export function logLocalStreamDestroyed(meta?: Record<string, unknown>): void {
  console.error('[LOCAL_STREAM_DESTROYED]', serialize(meta));
}

export function logRemoteStreamAdded(meta?: Record<string, unknown>): void {
  console.error('[REMOTE_STREAM_ADDED]', serialize(meta));
}

export function logRemoteStreamRemoved(meta?: Record<string, unknown>): void {
  console.error('[REMOTE_STREAM_REMOVED]', serialize(meta));
}

export function logAppStateChange(next: string, meta?: Record<string, unknown>): void {
  if (next === 'active') logAppStateActive(meta);
  else if (next === 'background') logAppStateBackground(meta);
  else if (next === 'inactive') logAppStateInactive({ ...meta, state: next });
  else console.error('[APPSTATE_CHANGE]', serialize({ state: next, ...meta }));
}
