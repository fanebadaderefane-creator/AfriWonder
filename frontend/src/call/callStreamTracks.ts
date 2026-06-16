/**
 * Accès sécurisés aux pistes MediaStream — évite `getAudioTracks of null` (crash natif juin 2026).
 * Module PUR — testable sans device.
 */

export type NullableMediaStreamLike = {
  getAudioTracks?: () => Array<{
    id?: string;
    enabled?: boolean;
    readyState?: string;
    muted?: boolean;
  }>;
  getVideoTracks?: () => Array<{
    id?: string;
    enabled?: boolean;
    readyState?: string;
    muted?: boolean;
  }>;
};

/** Tag livraison — visible Logcat avec PATCH_AUDIO_FIX_ACTIVE. */
export const CALL_NATIVE_STREAM_GUARD_TAG = '2026-06-16-stream-null-v1';

export function safeGetAudioTracks(
  stream: NullableMediaStreamLike | null | undefined,
): NonNullable<ReturnType<NonNullable<NullableMediaStreamLike['getAudioTracks']>>> {
  try {
    return stream?.getAudioTracks?.() ?? [];
  } catch {
    return [];
  }
}

export function safeGetVideoTracks(
  stream: NullableMediaStreamLike | null | undefined,
): NonNullable<ReturnType<NonNullable<NullableMediaStreamLike['getVideoTracks']>>> {
  try {
    return stream?.getVideoTracks?.() ?? [];
  } catch {
    return [];
  }
}

export function safeAudioTrackCount(stream: NullableMediaStreamLike | null | undefined): number {
  return safeGetAudioTracks(stream).length;
}

export function safeVideoTrackCount(stream: NullableMediaStreamLike | null | undefined): number {
  return safeGetVideoTracks(stream).length;
}

/** media_nudge / bind RTCView : ne pas toucher aux pistes tant que le PC n’est pas monté. */
export function shouldRunDeferredCallMediaNudge(input: {
  cancelled: boolean;
  pc: unknown;
  tearingDown?: boolean;
}): boolean {
  return !input.cancelled && !input.tearingDown && Boolean(input.pc);
}
