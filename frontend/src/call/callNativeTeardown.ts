/** Délai avant fermeture WebRTC natif — laisse React démonter RTCView (crash Android/iOS sinon). */
export const NATIVE_RTC_UNMOUNT_DELAY_MS = 150;

export function nativeRtcTeardownDelayMs(platformOs: string): number {
  return platformOs === 'web' ? 0 : NATIVE_RTC_UNMOUNT_DELAY_MS;
}

/** Bloque toute mise à jour d’URL RTCView pendant ou après la fin d’appel. */
export function shouldBlockNativeRtcUrlUpdate(options: {
  tearingDown: boolean;
  callEnded: boolean;
}): boolean {
  return options.tearingDown || options.callEnded;
}
