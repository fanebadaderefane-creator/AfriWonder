import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme/colors';
import { formatLiveCount } from './formatLiveCount';

export function LiveGoalBar({
  goalAmount,
  goalTarget,
  topInset = 0,
}: {
  goalAmount: number;
  goalTarget: number;
  topInset?: number;
}) {
  if (!goalTarget || goalTarget <= 0) return null;
  const pct = Math.min(100, goalTarget > 0 ? (100 * goalAmount) / goalTarget : 0);

  return (
    <View style={[styles.wrap, { top: topInset }]} pointerEvents="none">
      <Text style={styles.label}>
        Objectif {formatLiveCount(goalAmount)} / {formatLiveCount(goalTarget)} FCFA
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 12,
  },
  label: {
    color: '#FDE68A',
    fontSize: FontSizes.xs,
    fontWeight: '700',
    marginBottom: 4,
  },
  track: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
});
