/**
 * Liaison vidéo locale Agora — caméra front, re-bind aperçu (PiP stable).
 * N’altère pas joinChannel / token / signalisation socket.
 */
import type { IRtcEngine } from 'react-native-agora';
import { Platform } from 'react-native';
import { logAfwCall } from './callDiagnosticLog';
import {
  resolveAgoraDmCanvasStartPreview,
  shouldAgoraDmDirectEngineStartPreview,
} from './agoraDmPipPosition';
import {
  shouldAgoraDmSkipSetupLocalVideo,
  shouldAgoraSwitchCameraOnNonce,
} from './agoraCallVideoBind';

export { shouldAgoraSwitchCameraOnNonce, shouldAgoraDmSkipSetupLocalVideo };

/** startPreview moteur — iOS seulement hors canal ; Android = surface_layout via syncAgoraLocalVideoCanvas. */
export function maybeStartAgoraDmEnginePreview(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
  inChannel = false,
): void {
  if (!shouldAgoraDmDirectEngineStartPreview(Platform.OS, inChannel)) {
    logAfwCall('LOCAL_ENGINE_START_PREVIEW_SKIPPED', {
      ...meta,
      inChannel,
      platform: Platform.OS,
    });
    return;
  }
  try {
    const startPreview = (engine as { startPreview?: () => void | number }).startPreview;
    if (typeof startPreview === 'function') {
      startPreview.call(engine);
    }
  } catch (e) {
    logAfwCall('LOCAL_CANVAS_START_PREVIEW_SKIPPED', {
      ...meta,
      inChannel,
      error: String((e as Error)?.message ?? e),
    });
  }
}

type AgoraEngineWithCamera = IRtcEngine & {
  setCameraCapturerConfiguration?: (config: { cameraDirection?: number }) => number;
  setupLocalVideo?: (canvas: {
    uid: number;
    renderMode?: number;
    mirrorMode?: number;
  }) => number;
};

export function ensureAgoraFrontCamera(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      CameraDirection?: { CameraFront?: number };
    };
    const front = mod.CameraDirection?.CameraFront ?? 1;
    const eng = engine as AgoraEngineWithCamera;
    if (typeof eng.setCameraCapturerConfiguration === 'function') {
      eng.setCameraCapturerConfiguration({ cameraDirection: front });
    }
    logAfwCall('LOCAL_STREAM_CREATED', { ...meta, camera: 'front' });
    logAfwCall('CAMERA_FRONT_SELECTED', meta);
  } catch {
    logAfwCall('LOCAL_STREAM_CREATED', { ...meta, camera: 'front', configSkipped: true });
    logAfwCall('CAMERA_FRONT_SELECTED', { ...meta, configSkipped: true });
  }
}

export function logLocalStreamAttached(meta?: Record<string, unknown>): void {
  logAfwCall('LOCAL_STREAM_ATTACHED', meta);
}

export function logCameraFacingSelected(
  facing: 'front' | 'back',
  meta?: Record<string, unknown>,
): void {
  logAfwCall(facing === 'front' ? 'CAMERA_FRONT_SELECTED' : 'CAMERA_BACK_SELECTED', meta);
}

function localPreviewCanvasConfig(): {
  uid: number;
  renderMode: number;
  mirrorMode: number;
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-agora') as typeof import('react-native-agora') & {
    RenderModeType?: { RenderModeFit?: number };
    VideoMirrorModeType?: { VideoMirrorModeEnabled?: number };
  };
  return {
    uid: 0,
    renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
    mirrorMode: mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1,
  };
}

/** UI seule — rattache le canvas uid 0 ; startPreview optionnel (chat / premier plan). */
export function syncAgoraLocalVideoCanvas(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
  options?: { startPreview?: boolean; skipSetupLocalVideo?: boolean },
): void {
  const reason = typeof meta?.reason === 'string' ? meta.reason : undefined;
  const inChannel = meta?.inChannel === true;
  const skipSetupLocalVideo =
    options?.skipSetupLocalVideo ??
    shouldAgoraDmSkipSetupLocalVideo(Platform.OS, reason, inChannel);
  try {
    const eng = engine as AgoraEngineWithCamera;
    if (!skipSetupLocalVideo && typeof eng.setupLocalVideo === 'function') {
      eng.setupLocalVideo(localPreviewCanvasConfig());
    }
  } catch {
    /* setupLocalVideo optionnel selon version SDK */
  }
  if (options?.startPreview) {
    try {
      const startPreview = (engine as { startPreview?: () => void | number }).startPreview;
      if (typeof startPreview === 'function') {
        startPreview.call(engine);
      }
    } catch (e) {
      logAfwCall('LOCAL_CANVAS_START_PREVIEW_SKIPPED', {
        ...meta,
        error: String((e as Error)?.message ?? e),
      });
    }
  }
  logAfwCall('LOCAL_CANVAS_SYNC', {
    ...meta,
    startPreview: !!options?.startPreview,
    skipSetupLocalVideo,
    inChannel,
  });
}

/** Re-bind canvas uid 0 — startPreview seulement hors canal (preview sonnerie). */
export function rebindAgoraLocalPreview(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
): void {
  const reason = typeof meta?.reason === 'string' ? meta.reason : 'rebind';
  const inChannel = meta?.inChannel === true;
  syncAgoraLocalVideoCanvas(engine, meta, {
    startPreview: resolveAgoraDmCanvasStartPreview(reason, inChannel, Platform.OS),
  });
  logAfwCall('LOCAL_STREAM_REPLACED', meta);
  logAfwCall('LOCAL_RENDERER_ATTACHED', meta);
}

export function refreshAgoraLocalPreview(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
): void {
  rebindAgoraLocalPreview(engine, meta);
}

export function logAgoraSwitchCamera(meta?: Record<string, unknown>): void {
  logAfwCall('SWITCH_CAMERA', meta);
}
