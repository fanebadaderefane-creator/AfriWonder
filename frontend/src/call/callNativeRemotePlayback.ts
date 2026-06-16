/**
 * Playback audio distant natif — react-native-webrtc exige RTCView monté + volume _setVolume.
 * Module PUR — testable sans device.
 */

export function shouldRefreshNativeRemoteAudioPlayback(input: {
  isWebRuntime: boolean;
  pcTearingDown: boolean;
}): boolean {
  return !input.isWebRuntime && !input.pcTearingDown;
}

/** Points du cycle où re-binder le RTCView caché évite le silence (vocal natif). */
export const NATIVE_REMOTE_AUDIO_REFRESH_SOURCES = [
  'mark_call_connected',
  'sdp_remote_answer',
  'sdp_local_answer',
  'ice_connected',
  'pc_connected',
  'media_nudge',
] as const;

export type NativeRemoteAudioRefreshSource =
  (typeof NATIVE_REMOTE_AUDIO_REFRESH_SOURCES)[number];

export function isKnownNativeRemoteAudioRefreshSource(
  source: string,
): source is NativeRemoteAudioRefreshSource {
  return (NATIVE_REMOTE_AUDIO_REFRESH_SOURCES as readonly string[]).includes(source);
}
