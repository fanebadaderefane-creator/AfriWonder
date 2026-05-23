import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { FontSizes, Spacing } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const { colors } = useAppTheme();
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useState(new Animated.Value(-50))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      
      if (wasOffline && !offline) {
        // Just reconnected
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
      
      setWasOffline(offline);
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, [wasOffline]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: (isOffline || showReconnected) ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, showReconnected, slideAnim]);

  if (!isOffline && !showReconnected) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          backgroundColor: isOffline ? colors.error : colors.success 
        }
      ]}
    >
      <Ionicons 
        name={isOffline ? "cloud-offline" : "cloud-done"} 
        size={18} 
        color="#FFFFFF" 
      />
      <Text style={styles.text}>
        {isOffline ? 'Hors connexion' : 'Reconnecté ✓'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingTop: 50,
    zIndex: 1000,
    gap: Spacing.sm,
  },
  text: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
