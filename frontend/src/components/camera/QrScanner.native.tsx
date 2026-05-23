/**
 * Scanner QR natif (Android/iOS) — `react-native-vision-camera` v4 +
 * `useCodeScanner`. Metro résout ce fichier automatiquement sur les plateformes
 * `android` / `ios` ; le web utilise `./QrScanner.tsx` (fallback sans lib native).
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { Colors, FontSizes, Spacing, BorderRadius } from '../../theme/colors';
import type { QrScannerProps } from './QrScanner.types';

export type { QrScannerProps } from './QrScanner.types';

export default function QrScanner({
  onScan,
  active,
  style,
  permissionFallback,
  errorFallback,
}: QrScannerProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const handleCodes = useCallback(
    (codes: { value?: string }[]) => {
      if (!active) return;
      const first = codes.find((c) => typeof c.value === 'string' && c.value.trim().length > 0);
      if (first?.value) onScan(first.value);
    },
    [active, onScan],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: handleCodes,
  });

  const renderPermission = useMemo(
    () =>
      permissionFallback ?? (
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.title}>Caméra requise</Text>
          <Text style={styles.text}>Autorisez l'accès à la caméra pour scanner un QR code.</Text>
          <TouchableOpacity onPress={() => void requestPermission()} style={styles.btn}>
            <Text style={styles.btnText}>Autoriser</Text>
          </TouchableOpacity>
        </View>
      ),
    [permissionFallback, requestPermission],
  );

  if (!hasPermission) {
    return <View style={[styles.root, style]}>{renderPermission}</View>;
  }

  if (!device) {
    return (
      <View style={[styles.root, style]}>
        {errorFallback ?? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.text}>Initialisation de la caméra…</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active}
        codeScanner={codeScanner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: '#FFF',
  },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700' },
  text: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  btnText: { color: '#FFF', fontWeight: '700' },
});
