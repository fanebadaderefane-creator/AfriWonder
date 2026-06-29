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
