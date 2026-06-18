import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type FloatingReaction = { id: string; emoji: string };

export function CallFloatingReactions({ items }: { items: FloatingReaction[] }) {
  if (!items.length) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {items.map((item, index) => (
        <Animated.Text key={item.id} style={[styles.emoji, { bottom: 120 + index * 36 }]}>
          {item.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 5,
  },
  emoji: {
    position: 'absolute',
    fontSize: 42,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
