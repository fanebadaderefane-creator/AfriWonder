/**
 * Web fallback pour `IntegratedCameraRecorder`.
 *
 * Metro résout automatiquement ce fichier sur la plateforme `web` ; les
 * versions natives Android/iOS chargent à la place
 * `./IntegratedCameraRecorder.native.tsx` (qui dépend de `react-native-vision-camera`,
 * incompatible avec le bundle web).
 *
 * Ce fallback :
 *  - garde la même API publique (`IntegratedCameraRecorderProps`)
 *  - rend un Modal d'information invitant à utiliser l'app mobile
 *  - n'importe AUCUNE lib native — pas de risque de crash bundler.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import type { IntegratedCameraRecorderProps } from './IntegratedCameraRecorder.types';

export type { CameraDurationPreset, CameraSpeedPreset } from './cameraRecorderHelpers';
export type { CameraEffectId } from './cameraEffects';
export type {
  IntegratedCameraResult,
  IntegratedCameraFacing,
  IntegratedCameraFlash,
} from './IntegratedCameraRecorder.types';

export default function IntegratedCameraRecorder({ visible, onClose }: IntegratedCameraRecorderProps) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="phone-portrait-outline" size={44} color={Colors.primary} />
          <Text style={styles.title}>Caméra intégrée AfriWonder</Text>
          <Text style={styles.text}>
            Le mode TikTok-like (effets AR temps réel, flip caméra, vitesse, durée) est
            disponible uniquement sur l'application mobile Android / iOS.
          </Text>
          <Text style={styles.textMuted}>
            Sur le web, vous pouvez toujours uploader une vidéo depuis votre ordinateur via
            le bouton « + » → « Vidéo ».
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.btn} accessibilityLabel="Fermer">
            <Text style={styles.btnText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '800', textAlign: 'center' },
  text: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', lineHeight: 22 },
  textMuted: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  btnText: { color: '#FFF', fontWeight: '700' },
});
