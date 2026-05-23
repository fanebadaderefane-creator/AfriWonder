import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors, Spacing } from '../../theme/colors';

const { height: WIN_H } = Dimensions.get('window');

/**
 * Phase 8 — Skeleton feed (évite spinner seul sur fond vide).
 */
export function FeedSkeleton({ slideHeight }: { slideHeight: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const h = Math.max(200, slideHeight || WIN_H * 0.85);

  return (
    <View style={[styles.wrap, { height: h }]} accessibilityLabel="Chargement du fil">
      <Animated.View style={[styles.videoBlock, { opacity: pulse }]} />
      <View style={styles.sideCol}>
        <Animated.View style={[styles.circle, { opacity: pulse }]} />
        <Animated.View style={[styles.circle, { opacity: pulse }]} />
        <Animated.View style={[styles.circle, { opacity: pulse }]} />
      </View>
      <View style={styles.bottomBar}>
        <Animated.View style={[styles.lineShort, { opacity: pulse }]} />
        <Animated.View style={[styles.lineLong, { opacity: pulse }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#0a0a0a',
    justifyContent: 'flex-end',
  },
  videoBlock: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.card,
  },
  sideCol: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: 120,
    gap: Spacing.lg,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.border,
  },
  bottomBar: {
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  lineShort: { height: 14, width: '40%', borderRadius: 4, backgroundColor: Colors.border },
  lineLong: { height: 12, width: '65%', borderRadius: 4, backgroundColor: Colors.border },
});
