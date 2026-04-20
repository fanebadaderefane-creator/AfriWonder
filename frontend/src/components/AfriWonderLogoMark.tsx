import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

export function AfriWonderLogoMark({ size = 22, style }: { size?: number; style?: ViewStyle }) {
  const r = Math.max(6, Math.round(size * 0.28));
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: r,
        },
        style,
      ]}
      accessibilityLabel="AfriWonder"
      accessibilityRole="image"
    >
      <Text style={[styles.text, { fontSize: Math.max(10, Math.round(size * 0.52)) }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

