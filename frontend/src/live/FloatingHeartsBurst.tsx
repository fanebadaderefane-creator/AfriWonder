/**
 * FloatingHeartsBurst.tsx — Cœurs flottants TikTok-like
 *
 * Affiche un cœur animé qui monte avec un effet de balancier et fade-out,
 * comme dans TikTok Live. Performant grâce à useNativeDriver et auto-cleanup.
 *
 * Usage :
 *   const heartsRef = useRef<FloatingHeartsBurstHandle>(null);
 *   <FloatingHeartsBurst ref={heartsRef} />
 *   // déclencher : heartsRef.current?.burst();
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

export type FloatingHeartsBurstHandle = {
  burst: (x?: number, y?: number, color?: string) => void;
};

type HeartItem = {
  id: number;
  x: number;
  startY: number;
  color: string;
  size: number;
  driftPhase: number;
  anim: Animated.Value;
};

// Couleurs cœurs (palette AfriWonder + chaude pour l'Afrique de l'Ouest)
const HEART_COLORS = ['#FF6B00', '#FFD93D', '#FF3366', '#FF5C8A', '#22D3EE', '#A855F7'];

const FloatingHeartsBurst = forwardRef<FloatingHeartsBurstHandle, {}>((_, ref) => {
  const [hearts, setHearts] = useState<HeartItem[]>([]);
  const counterRef = useRef(0);

  const burst = useCallback((x?: number, y?: number, color?: string) => {
    const id = ++counterRef.current;
    const heart: HeartItem = {
      id,
      x: typeof x === 'number' ? x : SCREEN_W - 80 + Math.random() * 40,
      startY: typeof y === 'number' ? y : SCREEN_H - 200,
      color: color || HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      size: 22 + Math.random() * 14,
      driftPhase: Math.random() * Math.PI * 2,
      anim: new Animated.Value(0),
    };
    setHearts((prev) => [...prev, heart]);

    Animated.timing(heart.anim, {
      toValue: 1,
      duration: 2200 + Math.random() * 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    });
  }, []);

  useImperativeHandle(ref, () => ({ burst }), [burst]);

  // Cap : si plus de 50 cœurs, drop les plus anciens (perf protection)
  useEffect(() => {
    if (hearts.length > 50) {
      setHearts((prev) => prev.slice(-50));
    }
  }, [hearts.length]);

  return (
    <View style={styles.container} pointerEvents="none">
      {hearts.map((h) => {
        const translateY = h.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(SCREEN_H * 0.55)],
        });
        const drift = h.anim.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [
            0,
            Math.sin(h.driftPhase) * 30,
            Math.cos(h.driftPhase) * 25,
            Math.sin(h.driftPhase + 1) * 20,
            Math.cos(h.driftPhase + 1) * 10,
          ],
        });
        const opacity = h.anim.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = h.anim.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0.4, 1.2, 0.9],
        });
        return (
          <Animated.View
            key={h.id}
            style={[
              styles.heart,
              {
                left: h.x,
                top: h.startY,
                opacity,
                transform: [{ translateY }, { translateX: drift }, { scale }],
              },
            ]}
          >
            <Ionicons name="heart" size={h.size} color={h.color} />
          </Animated.View>
        );
      })}
    </View>
  );
});

FloatingHeartsBurst.displayName = 'FloatingHeartsBurst';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  heart: {
    position: 'absolute',
  },
});

export default FloatingHeartsBurst;
