/** Helpers purs pour pistes distantes WebRTC (testables sans device). */

export type MediaStreamLike = {
  getAudioTracks?: () => Array<{ enabled?: boolean; readyState?: string }>;
  getVideoTracks?: () => Array<{ enabled?: boolean; readyState?: string }>;
};

export function streamHasLiveAudio(stream: MediaStreamLike | null | undefined): boolean {
  const tracks = stream?.getAudioTracks?.() ?? [];
  return tracks.some((t) => t.readyState !== 'ended' && t.enabled !== false);
}

/** Le chronomètre ne démarre que lorsque l'audio distant est réellement disponible. */
export function shouldMarkCallConnected(input: {
  trackKind?: string;
  stream: MediaStreamLike | null | undefined;
}): boolean {
  if (input.trackKind === 'audio') return true;
  return streamHasLiveAudio(input.stream);
}

export function countLocalTracks(stream: MediaStreamLike | null | undefined): {
  audio: number;
  video: number;
} {
  return {
    audio: stream?.getAudioTracks?.().length ?? 0,
    video: stream?.getVideoTracks?.().length ?? 0,
  };
}
