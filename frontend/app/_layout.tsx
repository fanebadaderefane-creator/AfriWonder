import '../src/polyfills';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { Colors } from '../src/theme/colors';
import { View, StyleSheet } from 'react-native';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import notificationService from '../src/services/notificationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { loadStoredAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    loadStoredAuth();

    void notificationService.initialize();

    let subscription: { remove: () => void } | null = null;
    void notificationService
      .onNotificationResponse((response) => {
        const data = response.notification.request.content.data as
          | { type?: string; conversationId?: string; videoId?: string }
          | undefined;
        if (data?.type === 'message' && data?.conversationId) {
          router.push({ pathname: '/messages/[id]', params: { id: data.conversationId } });
        } else if (data?.type === 'mention' && data?.videoId) {
          router.push({ pathname: '/watch/[id]', params: { id: data.videoId } });
        } else if (data?.type === 'like' || data?.type === 'follow' || data?.type === 'comment') {
          router.push('/notifications');
        }
      })
      .then((sub) => {
        subscription = sub;
      });

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    void import('../src/services/e2eeMobileService').then((m) => m.ensureE2eeBootstrap(user.id));
  }, [isAuthenticated, user?.id]);

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
            <Stack.Screen name="creator" />
            <Stack.Screen name="payments" />
            <Stack.Screen name="orders" />
            <Stack.Screen name="wishlist" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="communities" />
            <Stack.Screen name="courses" />
            <Stack.Screen name="news" />
            <Stack.Screen name="search" />
            <Stack.Screen name="profile-edit" />
            <Stack.Screen name="profile-connections" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="sound-feed" />
            <Stack.Screen name="feed" />
            <Stack.Screen name="watch/[id]" />
            <Stack.Screen name="downloads" />
            <Stack.Screen name="tip" />
            <Stack.Screen name="discover" />
            <Stack.Screen name="about" />
            <Stack.Screen name="faq" />
            <Stack.Screen name="support-page" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="referrals" />
            <Stack.Screen name="stories" />
            <Stack.Screen name="subscriptions" />
            <Stack.Screen name="crowdfunding" />
            <Stack.Screen name="seller" />
            <Stack.Screen name="civic" />
            <Stack.Screen name="challenges" />
            <Stack.Screen name="miniapps" />
            <Stack.Screen name="assistant" />
            <Stack.Screen name="menu-plus" />
            <Stack.Screen name="data-protection" />
            <Stack.Screen name="admin-dashboard" />
            <Stack.Screen name="badges-profile" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="gamification-hub" />
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
