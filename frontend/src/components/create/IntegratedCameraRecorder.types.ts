/**
 * Types publics partagés entre `IntegratedCameraRecorder.tsx` (web fallback)
 * et `IntegratedCameraRecorder.native.tsx` (Android/iOS, vision-camera).
 *
 * Ce module ne charge AUCUNE lib native — il peut être importé sur web sans
 * faire planter le bundle Metro.
 */

import type { CameraDurationPreset, CameraSpeedPreset } from './cameraRecorderHelpers';
import type { CameraEffectId } from './cameraEffects';

export type IntegratedCameraFacing = 'back' | 'front';
export type IntegratedCameraFlash = 'off' | 'on' | 'auto';

export type IntegratedCameraResult = {
  uri: string;
  durationSec: number;
  facing: IntegratedCameraFacing;
  speed: CameraSpeedPreset;
  flash: IntegratedCameraFlash;
  gridEnabled: boolean;
  durationCapSec: CameraDurationPreset;
  effect: CameraEffectId;
};

export type IntegratedCameraRecorderProps = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (result: IntegratedCameraResult) => void;
  initialDurationCap?: CameraDurationPreset;
  initialSpeed?: CameraSpeedPreset;
  initialEffect?: CameraEffectId;
};

export type { CameraDurationPreset, CameraSpeedPreset } from './cameraRecorderHelpers';
export type { CameraEffectId } from './cameraEffects';
