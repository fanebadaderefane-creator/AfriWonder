/**
 * Web fallback de `<PreviewCamera>` — Metro choisit `.native.tsx` sur mobile.
 * Sur web, on ne charge pas `react-native-vision-camera` (incompatible).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing } from '../../theme/colors';
import type { PreviewCameraProps } from './PreviewCamera.types';

export type { PreviewCameraProps } from './PreviewCamera.types';

export default function PreviewCamera({ style }: PreviewCameraProps) {
  return (
    <View style={[styles.root, style]}>
      <Ionicons name="videocam-off-outline" size={36} color={Colors.textMuted} />
      <Text style={styles.text}>Aperçu caméra disponible sur l'app mobile.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  text: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
});
