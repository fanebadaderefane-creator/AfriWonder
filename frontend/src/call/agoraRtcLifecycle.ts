/**
 * Règles teardown Agora — le preview sonnerie ne doit jamais être libéré par un leave canal différé.
 */

export function shouldRunRtcChannelTeardown(input: {
  enabled: boolean;
  hasChannelEngine: boolean;
}): boolean {
  if (input.enabled) return true;
  return input.hasChannelEngine;
}

/** Libérer la session preview (moteur caméra hors canal) — uniquement fin d'appel ou leave canal réel. */
export function shouldReleaseAgoraPreviewSession(input: {
  callEnded: boolean;
  hadChannelEngine: boolean;
  previewOnlyRinging: boolean;
}): boolean {
  if (input.callEnded) return true;
  if (input.previewOnlyRinging) return false;
  return input.hadChannelEngine;
}
