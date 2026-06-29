/**
 * Layout aperçu caméra locale Agora DM — une seule surface montée par appel vidéo.
 * Rendu par AgoraDmLocalPreviewOverlay (root) — ne jamais démonter en mode PiP actif.
 */
import {
  shouldShowAgoraLocalCameraPip,
  shouldShowLocalVideoFullscreen,
} from './agoraDmVideoUi';

export function agoraDmLocalPreviewLayoutFingerprint(
  layout: AgoraDmLocalPreviewLayout,
): string {
  return `${layout.mountSurface}|${layout.containerStyle}|${layout.showVideo}|${layout.showPipFlip}|${layout.showFullAvatarFallback}`;
}

export type AgoraDmLocalPreviewLayout = {
  /** Garder RtcSurfaceView monté (ne pas démonter entre plein écran et PiP). */
  mountSurface: boolean;
  containerStyle: 'pip' | 'full' | 'hidden';
  /** Afficher les pixels caméra (camOn) — sinon surface montée mais invisible. */
  showVideo: boolean;
  showPipFlip: boolean;
  showFullAvatarFallback: boolean;
};

export function resolveAgoraDmLocalPreviewLayout(input: {
  isVideoCall: boolean;
  videoPublished: boolean;
  joined: boolean;
  camOn: boolean;
  localScreenSharing: boolean;
  remoteJoined: boolean;
  remoteEverJoined: boolean;
  mediaEnabled: boolean;
}): AgoraDmLocalPreviewLayout {
  const none: AgoraDmLocalPreviewLayout = {
    mountSurface: false,
    containerStyle: 'hidden',
    showVideo: false,
    showPipFlip: false,
    showFullAvatarFallback: false,
  };

  if (!input.isVideoCall || !input.videoPublished) {
    return none;
  }

  if (!input.mediaEnabled && !input.joined) {
    return none;
  }

  const showCameraPip = shouldShowAgoraLocalCameraPip({
    isVideoCall: input.isVideoCall,
    camOn: input.camOn,
    remoteEverJoined: input.remoteEverJoined,
  });
  const showLocalFull = shouldShowLocalVideoFullscreen({
    isVideoCall: input.isVideoCall,
    mediaEnabled: input.mediaEnabled,
    remoteEverJoined: input.remoteEverJoined,
    remoteJoined: input.remoteJoined,
  });

  if (showCameraPip) {
    return {
      mountSurface: true,
      containerStyle: 'pip',
      showVideo: input.camOn,
      showPipFlip: input.camOn,
      showFullAvatarFallback: false,
    };
  }

  if (showLocalFull) {
    return {
      mountSurface: true,
      containerStyle: 'full',
      showVideo: input.camOn,
      showPipFlip: false,
      showFullAvatarFallback: !input.camOn,
    };
  }

  if (input.remoteEverJoined && input.camOn) {
    return {
      mountSurface: true,
      containerStyle: 'pip',
      showVideo: true,
      showPipFlip: true,
      showFullAvatarFallback: false,
    };
  }

  if (input.remoteEverJoined || input.remoteJoined) {
    if (input.camOn) {
      return {
        mountSurface: true,
        containerStyle: 'pip',
        showVideo: true,
        showPipFlip: true,
        showFullAvatarFallback: false,
      };
    }
    return {
      mountSurface: true,
      containerStyle: 'hidden',
      showVideo: false,
      showPipFlip: false,
      showFullAvatarFallback: false,
    };
  }

  return {
    mountSurface: true,
    containerStyle: 'full',
    showVideo: input.camOn,
    showPipFlip: false,
    showFullAvatarFallback: !input.camOn,
  };
}

/** En chat minimisé : toujours PiP local (WhatsApp), jamais plein écran. */
export function resolveAgoraDmOverlayLocalPreviewLayout(
  layout: AgoraDmLocalPreviewLayout,
  minimized: boolean,
): AgoraDmLocalPreviewLayout {
  if (!minimized || !layout.mountSurface || layout.containerStyle !== 'full') {
    return layout;
  }
  return {
    ...layout,
    containerStyle: 'pip',
    showPipFlip: layout.showVideo,
  };
}

