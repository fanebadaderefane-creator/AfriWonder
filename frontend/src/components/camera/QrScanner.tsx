/**
 * Web fallback pour le scanner QR. Metro résout `.native.tsx` sur Android/iOS,
 * et ce fichier `.tsx` sur web où `react-native-vision-camera` ne fonctionne pas.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing } from '../../theme/colors';
import type { QrScannerProps } from './QrScanner.types';

export type { QrScannerProps } from './QrScanner.types';

export default function QrScanner({ style, errorFallback }: QrScannerProps) {
  return (
    <View style={[styles.root, style]}>
      {errorFallback ?? (
        <>
          <Ionicons name="qr-code-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.title}>Scan QR indisponible sur le web</Text>
          <Text style={styles.text}>
            Ouvrez AfriWonder sur mobile (Android / iOS) pour scanner un QR code.
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: '#FFF',
  },
  title: { color: Colors.text, fontSize: FontSizes.lg, fontWeight: '700', textAlign: 'center' },
  text: { color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
