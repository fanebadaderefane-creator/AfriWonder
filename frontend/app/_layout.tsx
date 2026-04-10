import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { Colors } from '../src/theme/colors';
import { View, StyleSheet } from 'react-native';

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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
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
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="live" />
            <Stack.Screen name="services" />
            <Stack.Screen name="product" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
          </Stack>
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
