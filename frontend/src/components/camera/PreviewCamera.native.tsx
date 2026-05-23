/**
 * Aperçu caméra natif via `react-native-vision-camera` (Android/iOS uniquement).
 * Metro résout ce fichier `.native.tsx` à la compilation ; le bundle web utilise
 * `./PreviewCamera.tsx` (fallback sans lib native).
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { Colors, FontSizes, Spacing } from '../../theme/colors';
import type { PreviewCameraProps } from './PreviewCamera.types';

export type { PreviewCameraProps } from './PreviewCamera.types';

export default function PreviewCamera({ facing, active, style }: PreviewCameraProps) {
  const device = useCameraDevice(facing);
  if (!device) {
    return (
      <View style={[styles.fallback, style]}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.text}>Caméra…</Text>
      </View>
    );
  }
  return (
    <Camera
      style={[StyleSheet.absoluteFillObject, style]}
      device={device}
      isActive={active}
      photo={false}
      video={false}
      audio={false}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  text: { color: Colors.textSecondary, fontSize: FontSizes.sm },
});
