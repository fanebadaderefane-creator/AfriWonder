/** Affichage vidéo Agora DM — parité WhatsApp (3 écrans). */

export function shouldShowAgoraVideoStage(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  joined: boolean;
  localScreenSharing: boolean;
  peerScreenSharing: boolean;
}): boolean {
  if (input.localScreenSharing || input.peerScreenSharing) return true;
  return input.isVideoCall && (input.mediaEnabled || input.joined);
}

/** Appel vidéo sortant : selfie plein écran tant que le correspondant n’a pas rejoint. */
export function shouldShowLocalVideoFullscreen(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  remoteJoined: boolean;
}): boolean {
  return input.isVideoCall && input.mediaEnabled && !input.remoteJoined;
}

/** Appel connecté : flux distant plein écran + pip local. */
export function shouldShowRemoteVideoFullscreen(input: {
  isVideoCall: boolean;
  remoteJoined: boolean;
}): boolean {
  return input.isVideoCall && input.remoteJoined;
}

export function shouldShowAgoraLocalCameraPip(input: {
  isVideoCall: boolean;
  camOn: boolean;
  localScreenSharing: boolean;
  remoteJoined: boolean;
}): boolean {
  return (
    input.isVideoCall &&
    input.remoteJoined &&
    input.camOn &&
    !input.localScreenSharing
  );
}

/** Rail vertical (ajouter / message / retourner) — sonnerie vidéo sortante. */
export function shouldShowVideoSideRail(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  remoteJoined: boolean;
}): boolean {
  return input.isVideoCall && input.mediaEnabled && !input.remoteJoined;
}
