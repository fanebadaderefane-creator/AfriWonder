/** Stub — Play In-App Updates disponible uniquement sur Android natif (EAS build). */
export type NativeInAppUpdateKind = 'force' | 'soft';

export type NativeInAppUpdateResult = 'started' | 'unavailable' | 'failed';

export async function startNativeInAppUpdate(
  _kind: NativeInAppUpdateKind,
): Promise<NativeInAppUpdateResult> {
  return 'unavailable';
}
