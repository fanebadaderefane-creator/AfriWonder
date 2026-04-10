import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing } from '../src/theme/colors';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { secureStorage } from '../src/utils/secureStorage';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Check auth and navigate
    const checkAuth = async () => {
      await loadStoredAuth();
      
      // Wait for animation
      setTimeout(async () => {
        const hasSeenOnboarding = await secureStorage.getItem('hasSeenOnboarding');
        const storedAuth = await secureStorage.getItem('accessToken');
        
        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
        } else if (storedAuth) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      }, 2000);
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.logoContainer,
        {
          transform: [{ scale: logoScale }],
          opacity: logoOpacity,
        }
      ]}>
        <View style={styles.logoCircle}>
          <Ionicons name="play" size={50} color={Colors.text} />
        </View>
      </Animated.View>
      
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.title}>AfriWonder</Text>
        <Text style={styles.subtitle}>La super-app vidéo africaine</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ in Africa</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
});
