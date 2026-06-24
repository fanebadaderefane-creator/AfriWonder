import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSizes, Spacing } from '../theme/colors';
import type { LiveGuestSlotRow } from './useLiveGuests';

export function LiveGuestGridBadge({
  slots,
  maxSlots,
  bottomOffset = 120,
}: {
  slots: LiveGuestSlotRow[];
  maxSlots: number;
  bottomOffset?: number;
}) {
  if (slots.length === 0) return null;
  return (
    <View style={[styles.wrap, { bottom: bottomOffset }]} pointerEvents="none">
      <Text style={styles.label}>
        Multi-guest {slots.length}/{maxSlots}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 11,
  },
  label: { color: '#FFF', fontSize: FontSizes.xs, fontWeight: '800' },
});
