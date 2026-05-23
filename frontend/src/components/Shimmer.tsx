import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animValue]);

  const opacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#222',
          opacity,
        },
        style,
      ]}
    />
  );
}

// Pre-built skeleton shapes
export function ShimmerCircle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  return <Shimmer width={size} height={size} borderRadius={size / 2} style={style} />;
}

export function ShimmerLine({ width = '100%', height = 14, style }: { width?: number | string; height?: number; style?: ViewStyle }) {
  return <Shimmer width={width} height={height} borderRadius={4} style={style} />;
}

export function ShimmerRect({ width = '100%', height = 200, borderRadius = 12, style }: { width?: number | string; height?: number; borderRadius?: number; style?: ViewStyle }) {
  return <Shimmer width={width} height={height} borderRadius={borderRadius} style={style} />;
}
