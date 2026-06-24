/**
 * Orientation caméra Agora pour lives — parité setup PreviewCamera (front par défaut).
 */
import type { IRtcEngine } from 'react-native-agora';

type AgoraEngineWithCamera = IRtcEngine & {
  setCameraCapturerConfiguration?: (config: { cameraDirection?: number }) => number;
};

export function setAgoraLiveCameraFacing(engine: IRtcEngine, facing: 'front' | 'back'): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as typeof import('react-native-agora') & {
      CameraDirection?: { CameraFront?: number; CameraRear?: number };
    };
    const front = mod.CameraDirection?.CameraFront ?? 1;
    const back = mod.CameraDirection?.CameraRear ?? 0;
    const eng = engine as AgoraEngineWithCamera;
    if (typeof eng.setCameraCapturerConfiguration !== 'function') return;
    eng.setCameraCapturerConfiguration({
      cameraDirection: facing === 'front' ? front : back,
    });
  } catch {
    /* SDK / version */
  }
}

export function startAgoraLiveHostPreview(engine: IRtcEngine): boolean {
  try {
    const result = engine.startPreview();
    if (typeof result === 'number' && result !== 0) return false;
    return true;
  } catch {
    return false;
  }
}
