import { beginWebCallMediaCapture } from './callNativeMedia';

/**
 * Pré-capture micro web lancée depuis le clic « Appeler » / « Accepter »
 * (geste utilisateur) avant la navigation vers `/messages/call`.
 */
let pendingWebCallMedia: Promise<MediaStream> | null = null;

/** Démarre getUserMedia pendant le geste clic (avant navigation). */
export function primeWebCallMediaCapture(wantVideo: boolean): void {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  stashWebCallMediaCapture(
    beginWebCallMediaCapture({
      mediaDevices: navigator.mediaDevices,
      wantVideo,
    }),
  );
}

export function stashWebCallMediaCapture(promise: Promise<MediaStream>): void {
  if (pendingWebCallMedia) {
    void pendingWebCallMedia.catch(() => {});
  }
  /** Évite « Uncaught (in promise) » entre le clic Appeler et l’écran call. */
  void promise.catch(() => {});
  pendingWebCallMedia = promise;
}

export function consumeWebCallMediaCapture(): Promise<MediaStream> | null {
  const pending = pendingWebCallMedia;
  pendingWebCallMedia = null;
  return pending;
}

export function clearWebCallMediaCapture(): void {
  if (pendingWebCallMedia) {
    void pendingWebCallMedia.catch(() => {});
  }
  pendingWebCallMedia = null;
}
