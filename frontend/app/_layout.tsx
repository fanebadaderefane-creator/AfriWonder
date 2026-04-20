import '../src/polyfills';
import { initMobileSentry } from '../src/lib/sentryMobile';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/store/authStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { ToastProvider } from '../src/components/common/ToastProvider';
import { IncomingCallOverlay } from '../src/components/call/IncomingCallOverlay';
import socketService from '../src/services/socketService';
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeContext';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import { probeAndroidDevBackendOrigin } from '../src/config/backendBase';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import notificationService from '../src/services/notificationService';
import { resolveMobileDeepLink } from '../src/services/mobileApiService';
import { normalizeIncomingMobileUrl, toAfriwonderResolveUrl } from '../src/utils/mobileDeepLink';
import offlineActionSyncService from '../src/services/offlineActionSyncService';
import { RouteErrorFallback } from '../src/components/common/RouteErrorFallback';
import { DataSaverProvider } from '../src/dataSaver/DataSaverContext';

initMobileSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function RootLayoutContent() {
  const { colors, mode } = useAppTheme();
  const { loadStoredAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  /** Android dev : détecte `10.0.2.2` vs IP LAN (MEmu) avant le premier appel API. */
  const [androidDevBackendProbeDone, setAndroidDevBackendProbeDone] = useState(
    () => !(Platform.OS === 'android' && typeof __DEV__ !== 'undefined' && __DEV__)
  );

  useEffect(() => {
    if (!(Platform.OS === 'android' && typeof __DEV__ !== 'undefined' && __DEV__)) return;
    void probeAndroidDevBackendOrigin().then(() => setAndroidDevBackendProbeDone(true));
  }, []);

  /**
   * Dev guardrail (web): certains appels réseau peuvent expirer pendant le bootstrap
   * (backend lent / route indisponible) et remonter en `unhandledrejection`, ce qui
   * affiche un écran rouge bloquant.
   *
   * On ignore uniquement les timeouts réseau connus pour garder l'app navigable.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event?.reason as { message?: string; code?: string } | undefined;
      const msg = String(reason?.message || event?.reason || '').toLowerCase();
      const code = String(reason?.code || '').toLowerCase();
      const isTimeout = msg.includes('timeout exceeded') || code === 'econaborted';
      if (isTimeout) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    return () => window.removeEventListener('unhandledrejection', onUnhandled);
  }, []);

  /**
   * Persistance session (Expo / React Native) : au retour au premier plan, relire SecureStore / AsyncStorage
   * pour garder `useAuthStore` aligné avec le disque (tokens rafraîchis ailleurs, restauration OS, etc.).
   */
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        void loadStoredAuth();
      }
    });
    return () => sub.remove();
  }, [loadStoredAuth]);

  useEffect(() => {
    const pushResolvedRoute = (route: string) => {
      const r = String(route || '').trim();
      const qIdx = r.indexOf('?');
      if (qIdx === -1) {
        router.push(r as Parameters<typeof router.push>[0]);
        return;
      }
      const pathname = r.slice(0, qIdx);
      const qs = r.slice(qIdx + 1);
      try {
        const search = new URLSearchParams(qs);
        const params: Record<string, string> = {};
        search.forEach((v, k) => {
          params[k] = v;
        });
        router.push({ pathname, params } as Parameters<typeof router.push>[0]);
      } catch {
        router.push(pathname as Parameters<typeof router.push>[0]);
      }
    };

    const handleIncomingUrl = async (url: string | null | undefined) => {
      const raw = String(url || '').trim();
      if (!raw) return;
      const normalized = normalizeIncomingMobileUrl(raw);
      const resolveUrl = toAfriwonderResolveUrl(normalized);
      if (!resolveUrl) return;
      try {
        const resolved = await resolveMobileDeepLink(resolveUrl);
        if (resolved?.route) {
          pushResolvedRoute(resolved.route);
        }
      } catch {
        /* ignore unresolved deep links */
      }
    };

    loadStoredAuth();

    void notificationService.initialize();
    const offlineSyncCleanup = offlineActionSyncService.initAutoFlush();
    void Linking.getInitialURL().then((url) => handleIncomingUrl(url));

    let subscription: { remove: () => void } | null = null;
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });
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
      urlSubscription.remove();
      offlineSyncCleanup?.();
    };
  }, [loadStoredAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void notificationService.syncPushTokenWithBackend();
  }, [isAuthenticated]);

  /**
   * Connecte le socket Socket.IO dès qu'on a un access token, pour recevoir
   * les invitations d'appel (`call:invite`), les nouveaux messages, présences, etc.
   * Émet `user:join` après authentification → déclenche `broadcastPresence(true)`
   * côté backend, pour que les contacts voient le point vert "en ligne".
   */
  const accessToken = useAuthStore((s) => s.accessToken);
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) return;
    const userName = user.username ?? user.display_name ?? undefined;
    socketService.connect(accessToken);
    const off = socketService.on('authenticated', () => {
      socketService.joinUserRoom(user.id, userName);
    });
    /** Si déjà connecté avant l'`useEffect`, on join directement. */
    if (socketService.isConnected) {
      socketService.joinUserRoom(user.id, userName);
    }
    return () => {
      off();
    };
  }, [isAuthenticated, accessToken, user?.id, user?.username, user?.display_name]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    void import('../src/services/e2eeMobileService')
      .then((m) => {
        if (typeof m.ensureE2eeBootstrap === 'function') {
          return m.ensureE2eeBootstrap(user.id);
        }
      })
      .catch(() => {
        /* Expo Go / sans module natif quick-crypto : E2EE indisponible, non bloquant */
      });
  }, [isAuthenticated, user?.id]);

  if (!androidDevBackendProbeDone) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <View style={[styles.fill, { backgroundColor: colors.background, overflow: 'hidden' }]}>
            <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
            <OfflineBanner />
            <IncomingCallOverlay />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="interests" />
            <Stack.Screen name="suggest-creators" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="live" />
            <Stack.Screen name="services" />
            <Stack.Screen name="product" />
            <Stack.Screen name="cart" />
            <Stack.Screen name="wallet" />
            <Stack.Screen name="africoin" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="creator" />
            <Stack.Screen name="payments/index" />
            <Stack.Screen name="orders" />
            <Stack.Screen name="wishlist" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="communities" />
            <Stack.Screen name="courses" />
            <Stack.Screen name="news" />
            <Stack.Screen name="search" />
            <Stack.Screen name="find-friends" />
            <Stack.Screen name="connect-now" />
            <Stack.Screen name="sync-contacts" />
            <Stack.Screen name="profile-edit" />
            <Stack.Screen name="profile-connections" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="sound-feed" />
            <Stack.Screen name="feed" />
            <Stack.Screen name="watch/[id]" />
            <Stack.Screen name="downloads" />
            <Stack.Screen name="tip" />
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
            <Stack.Screen name="saved-collections" />
            <Stack.Screen name="miniapps" />
            <Stack.Screen name="assistant" />
            <Stack.Screen name="menu-plus" />
            <Stack.Screen name="data-protection" />
            <Stack.Screen name="admin-dashboard" />
            <Stack.Screen name="admin-settings" />
            <Stack.Screen name="badges-profile" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="gamification-hub" />
          </Stack>
          </View>
        </ToastProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemeProvider>
        <DataSaverProvider>
          <RootLayoutContent />
        </DataSaverProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

/** Phase 8 — Boundary Expo Router : retry + retour accueil. */
export function ErrorBoundary(props: { error: Error; retry: () => Promise<void> }) {
  return <RouteErrorFallback {...props} />;
}
