import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme/colors';
import {
  clampPublishUploadPercent,
  getPublishUploadStatusLabel,
  type PublishUploadUiStatus,
} from '../../create/publishUploadProgress';

type UploadProgressOverlayProps = {
  visible: boolean;
  percent: number;
  status: PublishUploadUiStatus;
  retryAttempt: number;
  isVideo: boolean;
  onCancel: () => void;
};

export function UploadProgressOverlay({
  visible,
  percent,
  status,
  retryAttempt,
  isVideo,
  onCancel,
}: UploadProgressOverlayProps) {
  const pct = clampPublishUploadPercent(percent);
  const label = getPublishUploadStatusLabel({ percent: pct, status, retryAttempt, isVideo });
  const canCancel = status === 'uploading' || status === 'retrying';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={canCancel ? onCancel : undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.percent}>{pct}%</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.label}>{label}</Text>
          {canCancel ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Annuler l’upload"
            >
              <Ionicons name="close-circle-outline" size={20} color="#fff" />
              <Text style={styles.cancelText}>Annuler l’envoi</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  percent: {
    marginTop: 16,
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    marginTop: 16,
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  label: {
    marginTop: 14,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  cancelBtn: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(229,57,53,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
