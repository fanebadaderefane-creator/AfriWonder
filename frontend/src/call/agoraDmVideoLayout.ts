/** Layout vidéo DM — quel flux est plein écran vs PiP (UI seule, pas Agora). */

export type AgoraDmVideoFeedPlacement = 'fullscreen' | 'pip' | 'hidden';

export function resolveAgoraDmVideoFeedPlacements(input: {
  isVideoCall: boolean;
  remoteJoined: boolean;
  /** Une fois le correspondant vu, ne pas repasser en selfie plein écran si remoteJoined fluctue (4G). */
  remoteEverJoined?: boolean;
  mediaEnabled: boolean;
  feedsSwapped: boolean;
}): { local: AgoraDmVideoFeedPlacement; remote: AgoraDmVideoFeedPlacement } {
  if (!input.isVideoCall) {
    return { local: 'hidden', remote: 'hidden' };
  }
  const peerPresent = input.remoteEverJoined ?? input.remoteJoined;
  if (!peerPresent) {
    return {
      local: input.mediaEnabled ? 'fullscreen' : 'hidden',
      remote: 'hidden',
    };
  }
  if (input.feedsSwapped) {
    return { local: 'fullscreen', remote: 'pip' };
  }
  return { local: 'pip', remote: 'fullscreen' };
}

/** Dimensions PiP — identiques overlay local et remote pip. */
export const AGORA_DM_VIDEO_PIP_WIDTH = 110;
export const AGORA_DM_VIDEO_PIP_HEIGHT = 156;

/** Tap-to-reveal chrome (dock masqué) — sous le PiP pour laisser passer le swap WhatsApp. */
export const AGORA_DM_TAP_REVEAL_Z_INDEX = 50;
export const AGORA_DM_TAP_REVEAL_ELEVATION = 50;

/** PiP draggable + tap inversion — au-dessus du tap-to-reveal (Android elevation). */
export const AGORA_DM_PIP_TOUCH_Z_INDEX = 100;
export const AGORA_DM_PIP_TOUCH_ELEVATION = 100;
