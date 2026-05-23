/**
 * No-op natif. Sur Android/iOS, c'est `IntegratedCameraRecorder` qui gère
 * l'enregistrement (via `react-native-vision-camera`). Ce fichier existe pour
 * que Metro ait toujours quelque chose à résoudre quand `WebVideoRecorder` est
 * importé sans condition de plateforme depuis `create.tsx`.
 */

import type { WebVideoRecorderProps } from './WebVideoRecorder.types';

export type { WebVideoRecorderProps };

export default function WebVideoRecorder(_props: WebVideoRecorderProps) {
  return null;
}
