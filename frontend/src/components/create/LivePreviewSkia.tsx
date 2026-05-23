import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import type { CameraEffectId } from './cameraEffects';

type Props = {
  effect: CameraEffectId;
  width: number;
  height: number;
};

/**
 * Aperçu visuel **léger** par-dessus `<CameraView>` pour les effets AR caméra.
 *
 * Limitation honnête : un blur Skia ne peut PAS lire les pixels d'une vue native
 * `<CameraView>` (deux surfaces de rendu distinctes). Pour un vrai pipeline AR
 * temps réel, il faudrait `react-native-vision-camera` + frame processors —
 * hors budget Mali / 2 Go RAM. Ici on rend uniquement un calque GPU qui simule
 * la teinte de l'effet (gradient chaud, halo écran vert) afin que l'utilisateur
 * comprenne ce qui sera appliqué à la publication.
 *
 * Le rendu pixel **réel** est fait côté serveur par `transcoding.service.ts`
 * (filtres ffmpeg dérivés de `editor_metadata`).
 */
export default function LivePreviewSkia({ effect, width, height }: Props) {
  if (Platform.OS === 'web' || effect === 'none' || width <= 0 || height <= 0) {
    return null;
  }

  const colors = (() => {
    if (effect === 'lumiere_chaude') return ['rgba(255,170,80,0.20)', 'rgba(255,140,60,0.12)'];
    if (effect === 'lissage_doux') return ['rgba(255,240,230,0.16)', 'rgba(255,210,200,0.10)'];
    if (effect === 'ecran_vert') return ['rgba(0,255,80,0.14)', 'rgba(0,180,90,0.08)'];
    return ['transparent', 'transparent'];
  })();

  const showChromaBorder = effect === 'ecran_vert';

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.root]}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={colors}
          />
        </Rect>
      </Canvas>
      {showChromaBorder ? <View pointerEvents="none" style={styles.chromaBorder} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 5 },
  chromaBorder: {
    ...StyleSheet.absoluteFillObject,
    borderColor: 'rgba(0,255,90,0.55)',
    borderWidth: 2,
  },
});
