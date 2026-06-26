/** Affichage vidéo Agora DM — parité WhatsApp (3 écrans). */

export function shouldShowAgoraVideoStage(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  joined: boolean;
  previewActive?: boolean;
  localScreenSharing: boolean;
  peerScreenSharing: boolean;
}): boolean {
  if (input.localScreenSharing || input.peerScreenSharing) return true;
  return input.isVideoCall && (input.mediaEnabled || input.joined || !!input.previewActive);
}

/** Appel vidéo sortant : selfie plein écran tant que le correspondant n’a pas rejoint le canal. */
export function shouldShowLocalVideoFullscreen(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  remoteEverJoined: boolean;
  remoteJoined?: boolean;
}): boolean {
  if (!input.isVideoCall || !input.mediaEnabled) return false;
  if (input.remoteEverJoined || input.remoteJoined) return false;
  return true;
}

/** Appel connecté : flux distant plein écran + pip local. */
export function shouldShowRemoteVideoFullscreen(input: {
  isVideoCall: boolean;
  remoteJoined: boolean;
  remoteEverJoined?: boolean;
}): boolean {
  if (!input.isVideoCall) return false;
  return !!input.remoteJoined || !!input.remoteEverJoined;
}

/**
 * PiP local — une fois le correspondant vu (`remoteEverJoined`), reste en PiP
 * même si `remoteJoined` fluctue (4G) ou pendant partage d’écran.
 */
export function shouldShowAgoraLocalCameraPip(input: {
  isVideoCall: boolean;
  camOn: boolean;
  remoteEverJoined: boolean;
}): boolean {
  return input.isVideoCall && input.remoteEverJoined && input.camOn;
}

/** Rail vertical (ajouter / message / retourner) — sonnerie vidéo sortante. */
export function shouldShowVideoSideRail(input: {
  isVideoCall: boolean;
  mediaEnabled: boolean;
  remoteEverJoined: boolean;
}): boolean {
  return input.isVideoCall && input.mediaEnabled && !input.remoteEverJoined;
}

