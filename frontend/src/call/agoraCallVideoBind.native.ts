/**
 * Liaison vidéo locale Agora — caméra front, re-bind aperçu (PiP stable).
 * N’altère pas joinChannel / token / signalisation socket.
 */
import type { IRtcEngine } from 'react-native-agora';
import { logAfwCall } from './callDiagnosticLog';

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

/** Re-bind canvas uid 0 + startPreview — après join, layout PiP ou switchCamera. */
export function rebindAgoraLocalPreview(
  engine: IRtcEngine,
  meta?: Record<string, unknown>,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      RenderModeType?: { RenderModeFit?: number };
      VideoMirrorModeType?: { VideoMirrorModeEnabled?: number };
    };
    const eng = engine as AgoraEngineWithCamera;
    if (typeof eng.setupLocalVideo === 'function') {
      eng.setupLocalVideo({
        uid: 0,
        renderMode: mod.RenderModeType?.RenderModeFit ?? 1,
        mirrorMode: mod.VideoMirrorModeType?.VideoMirrorModeEnabled ?? 1,
      });
    }
  } catch {
    /* setupLocalVideo optionnel selon version SDK */
  }
  try {
    const startPreview = (engine as { startPreview?: () => void }).startPreview;
    if (typeof startPreview === 'function') {
      startPreview.call(engine);
    }
  } catch {
    /* ignore */
  }
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
