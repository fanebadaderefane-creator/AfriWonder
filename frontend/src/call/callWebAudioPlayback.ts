import {
  enableRemoteAudioTracks,
  streamHasActiveMediaTracks,
  streamHasPlayableMediaTracks,
} from './callNativeMedia';
import { mediaStreamBindingKey, streamHasLiveAudio } from './callRemoteMedia';

const lastBoundKey = new WeakMap<HTMLMediaElement, string>();

/** Web : attache un MediaStream via `srcObject` — évite de réinitialiser la lecture si rien n’a changé. */
export function bindWebRtcMediaElement(
  el: HTMLVideoElement | HTMLAudioElement | null,
  stream: MediaStream | null | undefined,
  opts?: { force?: boolean; allowPendingTracks?: boolean },
): void {
  if (!el) return;
  try {
    const next = stream ?? null;
    const canPlay = opts?.allowPendingTracks
      ? streamHasPlayableMediaTracks(next)
      : streamHasActiveMediaTracks(next);
    if (el.src) el.removeAttribute('src');
    if (!canPlay) {
      if (el.srcObject) {
        el.srcObject = null;
        lastBoundKey.delete(el);
      }
      return;
    }

    const key = mediaStreamBindingKey(next);
    const prevKey = lastBoundKey.get(el);
    const sameBinding = el.srcObject === next && prevKey === key;

    if (sameBinding && !el.paused) {
      return;
    }

    const tracksChanged = prevKey !== key || el.srcObject !== next;
    if (tracksChanged) {
      if (opts?.force && el.srcObject && el.srcObject !== next) {
        el.srcObject = null;
      }
      el.srcObject = next;
      lastBoundKey.set(el, key);
    }

    if (el instanceof HTMLAudioElement) {
      el.muted = false;
      el.volume = 1;
    }
    if (tracksChanged || el.paused) {
      void el.play().catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export function clearWebRtcMediaElement(el: HTMLVideoElement | HTMLAudioElement | null | undefined): void {
  if (!el) return;
  try {
    el.pause();
    if (el.src) el.removeAttribute('src');
    el.srcObject = null;
    lastBoundKey.delete(el);
  } catch {
    /* ignore */
  }
}

const WEB_AUDIO_PLAYBACK_POLL_MS = 250;
const WEB_AUDIO_PLAYBACK_MAX_POLLS = 24;

/**
 * Web audio-only : relance `play()` tant que la piste distante n’est pas `live`,
 * sans réassigner `srcObject` en boucle (évite saccades / écho perçu).
 */
export function startRemoteWebAudioPlayback(
  el: HTMLAudioElement | null,
  stream: MediaStream | null | undefined,
  existingPoll: ReturnType<typeof setInterval> | null,
): ReturnType<typeof setInterval> | null {
  if (existingPoll) clearInterval(existingPoll);
  if (!el || !stream) return null;

  const tick = () => {
    if (!streamHasPlayableMediaTracks(stream)) return;
    enableRemoteAudioTracks(stream);
    bindWebRtcMediaElement(el, stream, { allowPendingTracks: true });
  };

  tick();
  if (streamHasLiveAudio(stream) && !el.paused) {
    return null;
  }

  let polls = 0;
  const pollId = setInterval(() => {
    polls += 1;
    tick();
    if (streamHasLiveAudio(stream) && !el.paused) {
      clearInterval(pollId);
      return;
    }
    if (polls >= WEB_AUDIO_PLAYBACK_MAX_POLLS) {
      clearInterval(pollId);
    }
  }, WEB_AUDIO_PLAYBACK_POLL_MS);
  return pollId;
}
