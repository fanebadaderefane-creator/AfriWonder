import type { CameraEffectId } from './cameraEffects';
import type { CameraFlashCycle } from './cameraRecorderHelpers';

/**
 * Helpers purs pour mapper l'API "Expo-camera-like" interne vers `react-native-vision-camera`.
 *
 * Pourquoi un module dédié : la lib vision-camera est imposée uniquement sur le composant
 * `IntegratedCameraRecorder`. Les types ici restent simples (`CameraPosition`, `'on' | 'off' | 'auto'`)
 * pour pouvoir les tester sans charger le runtime natif.
 */

export type VisionCameraPosition = 'back' | 'front';
/**
 * `startRecording` de vision-camera v4 n'accepte que `on` | `off`. La modalité `auto`
 * du cycle interne est rabattue sur `off` par sécurité (sinon le SDK lance une erreur).
 */
export type VisionCameraFlash = 'on' | 'off';

export function cameraPositionFor(facing: VisionCameraPosition): VisionCameraPosition {
  return facing === 'front' ? 'front' : 'back';
}

export function visionCameraFlashFor(flash: CameraFlashCycle): VisionCameraFlash {
  if (flash === 'on') return 'on';
  return 'off';
}

/**
 * Couleur RGBA d'overlay JS à appliquer **en plus** du frame processor Skia.
 * Sert de fallback visuel si le frame processor n'est pas disponible (Expo Go,
 * device sans GPU support, lib non liée).
 *
 * Renvoie `null` quand l'effet est `none` (pas d'overlay).
 */
export function buildLiveAREffectColor(effect: CameraEffectId): string | null {
  if (effect === 'lumiere_chaude') return 'rgba(255,170,80,0.10)';
  if (effect === 'lissage_doux') return 'rgba(255,235,225,0.06)';
  if (effect === 'ecran_vert') return 'rgba(0,255,80,0.06)';
  return null;
}

/**
 * Décrit l'opération à exécuter dans le frame processor Skia. Retourné par
 * `useArFrameProcessor` côté hook, et utilisé dans les tests pour s'assurer du
 * mapping `CameraEffectId → opération`.
 */
export type ArFrameProcessorOp =
  | { kind: 'noop' }
  | { kind: 'overlay'; rgba: { r: number; g: number; b: number; a: number } }
  | { kind: 'blur'; sigma: number; rgba: { r: number; g: number; b: number; a: number } };

export function buildArFrameProcessorOp(effect: CameraEffectId): ArFrameProcessorOp {
  if (effect === 'lumiere_chaude') {
    return { kind: 'overlay', rgba: { r: 255, g: 170, b: 80, a: 0.18 } };
  }
  if (effect === 'lissage_doux') {
    return { kind: 'blur', sigma: 6, rgba: { r: 255, g: 235, b: 225, a: 0.10 } };
  }
  if (effect === 'ecran_vert') {
    return { kind: 'overlay', rgba: { r: 0, g: 255, b: 80, a: 0.14 } };
  }
  return { kind: 'noop' };
}
