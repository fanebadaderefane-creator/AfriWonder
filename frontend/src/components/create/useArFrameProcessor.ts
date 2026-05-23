/**
 * Hook qui construit un frame processor `react-native-vision-camera` + Skia pour
 * appliquer en temps réel un effet AR sur les pixels de la caméra.
 *
 * IMPORTANT — limitations honnêtes (cf. règle `client-delivery-integrity`) :
 *  - Pas de face landmark detection — donc le "lissage doux" est un blur GLOBAL
 *    (toute la frame est floue, pas seulement la peau). C'est le compromis budget
 *    APK Mali / 2 Go RAM (face detection = +5 Mo APK + lib native).
 *  - L'écran vert ici applique un overlay vert simulé (le vrai chroma key par
 *    couleur dominante reste appliqué côté serveur via ffmpeg lors du publish).
 *  - Le rendu pixel **DÉFINITIF** est appliqué côté serveur (`transcoding.service.ts`)
 *    à partir de `editor_metadata` — ce frame processor n'est qu'un aperçu live.
 *
 * Le hook retourne `undefined` quand le runtime Skia n'est pas chargé (web,
 * Expo Go, ancien device) → la `<Camera>` rend la frame brute sans overlay GPU.
 */

import { useMemo } from 'react';
import { Platform } from 'react-native';
import type { CameraEffectId } from './cameraEffects';
import { buildArFrameProcessorOp } from './visionCameraEffects';

type FrameProcessor = (frame: unknown) => void;

export function useArFrameProcessor(effect: CameraEffectId): FrameProcessor | undefined {
  const op = useMemo(() => buildArFrameProcessorOp(effect), [effect]);

  return useMemo(() => {
    if (Platform.OS === 'web') return undefined;
    if (op.kind === 'noop') return undefined;

    let useSkiaFrameProcessor: ((cb: any, deps: unknown[]) => any) | null = null;
    let Skia: any = null;
    try {
      const skiaModule = require('@shopify/react-native-skia');
      useSkiaFrameProcessor = skiaModule?.useSkiaFrameProcessor || null;
      Skia = skiaModule?.Skia || null;
    } catch {
      return undefined;
    }
    if (!useSkiaFrameProcessor || !Skia) return undefined;

    /* eslint-disable react-hooks/rules-of-hooks */
    return useSkiaFrameProcessor((frame: any) => {
      'worklet';
      try {
        frame.render();
      } catch {
        return;
      }

      if (op.kind === 'overlay') {
        try {
          const paint = Skia.Paint();
          paint.setColor(
            Skia.Color(`rgba(${op.rgba.r},${op.rgba.g},${op.rgba.b},${op.rgba.a})`),
          );
          const rect = { x: 0, y: 0, width: frame.width, height: frame.height };
          frame.drawRect?.(rect, paint);
        } catch {
          /* no-op : si l'API drawRect n'est pas dispo on laisse la frame brute */
        }
      } else if (op.kind === 'blur') {
        try {
          const paint = Skia.Paint();
          if (Skia.ImageFilter?.MakeBlur) {
            paint.setImageFilter(Skia.ImageFilter.MakeBlur(op.sigma, op.sigma, 0, null));
          }
          paint.setColor(
            Skia.Color(`rgba(${op.rgba.r},${op.rgba.g},${op.rgba.b},${op.rgba.a})`),
          );
          const rect = { x: 0, y: 0, width: frame.width, height: frame.height };
          frame.drawRect?.(rect, paint);
        } catch {
          /* no-op */
        }
      }
    }, [op]);
    /* eslint-enable react-hooks/rules-of-hooks */
  }, [op]);
}
