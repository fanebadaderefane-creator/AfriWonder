import { Stack, router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { Colors } from '../src/theme/colors';
import { View, StyleSheet, Platform } from 'react-native';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import notificationService from '../src/services/notificationService';
import * as Notifications from 'expo-notifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { loadStoredAuth, isLoading } = useAuthStore();
  const notificationResponseRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    loadStoredAuth();

    // Initialize push notifications
    notificationService.initialize();

    // Handle notification taps (navigate to correct screen)
    notificationResponseRef.current = notificationService.onNotificationResponse((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'message' && data?.conversationId) {
        router.push({ pathname: '/messages/[id]', params: { id: data.conversationId } });
      } else if (data?.type === 'like' || data?.type === 'follow' || data?.type === 'comment') {
        router.push('/notifications');
      }
    });

    return () => {
      if (notificationResponseRef.current) {
        Notifications.removeNotificationSubscription(notificationResponseRef.current);
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
        <View style={styles.container}>
          <StatusBar style="light" />
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="interests" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="live" />
            <Stack.Screen name="services" />
            <Stack.Screen name="product" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="orders" />
            <Stack.Screen name="wishlist" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="communities" />
            <Stack.Screen name="courses" />
            <Stack.Screen name="news" />
            <Stack.Screen name="search" />
            <Stack.Screen name="discover" />
            <Stack.Screen name="about" />
            <Stack.Screen name="faq" />
            <Stack.Screen name="support-page" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="stories" />
            <Stack.Screen name="crowdfunding" />
            <Stack.Screen name="seller" />
            <Stack.Screen name="civic" />
            <Stack.Screen name="challenges" />
            <Stack.Screen name="miniapps" />
            <Stack.Screen name="assistant" />
          </Stack>
        </View>
      </QueryClientProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
