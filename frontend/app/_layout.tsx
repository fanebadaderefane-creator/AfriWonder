import '../src/polyfills';
import { captureSentryException, initMobileSentry } from '../src/lib/sentryMobile';
import { installMobileRuntimeGuards } from '../src/lib/mobileRuntimeGuards';
import { installMobileSessionStability } from '../src/lib/mobileSessionStability';
import { AppRootErrorBoundary } from '../src/components/common/AppRootErrorBoundary';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/store/authStore';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OfflineBanner } from '../src/components/common/OfflineBanner';
import { ToastProvider } from '../src/components/common/ToastProvider';
import { IncomingCallOverlay } from '../src/components/call/IncomingCallOverlay';
import { InCallFloatingBar } from '../src/components/call/InCallFloatingBar';
import { AgoraDmLocalPreviewOverlay } from '../src/components/call/AgoraDmLocalPreviewOverlay';
import socketService from '../src/services/socketService';
import { ThemeProvider, useAppTheme } from '../src/theme/ThemeContext';
import { View, StyleSheet, Platform, AppState } from 'react-native';
import {
  probeAndroidDevBackendOrigin,
  shouldBlockUiUntilAndroidDevBackendProbe,
} from '../src/config/backendBase';
import { startBackendWarmupAtBoot } from '../src/api/backendWarmup';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import notificationService from '../src/services/notificationService';
import { initIncomingCallService, wireIncomingCallSocket, displayIncomingCall } from '../src/services/incomingCallService';
import { wireGroupCallParticipantInvite } from '../src/call/wireGroupCallParticipantInvite';
import { initVoipPushService } from '../src/services/voipPushService';
import { initLiveStartedNotifService } from '../src/services/liveStartedNotifService';
import { resolveMobileDeepLink } from '../src/services/mobileApiService';
import { normalizeIncomingMobileUrl, toAfriwonderResolveUrl } from '../src/utils/mobileDeepLink';
import offlineActionSyncService from '../src/services/offlineActionSyncService';
import feedVideoOfflineCache from '../src/services/feedVideoOfflineCache';
import NetInfo from '@react-native-community/netinfo';
import uploadRecoveryService from '../src/services/uploadRecoveryService';
import { RouteErrorFallback } from '../src/components/common/RouteErrorFallback';
import { AppUpdatePrompt } from '../src/components/common/AppUpdatePrompt';
import { DataSaverProvider, useDataSaver } from '../src/dataSaver/DataSaverContext';
import { shouldBootstrapOfflineCacheOnLaunch } from '../src/config/mobileDataPolicy';
import { navigateFromStarBookingNotification } from '../src/utils/starBookingPushNavigation';
import { navigateToIncomingCallFromPush } from '../src/call/incomingCallPushNavigation';
import { isExpoGoApp } from '../src/config/expoRuntime';
import { devLog } from '../src/utils/devLog';
import { safeRouterPush } from '../src/utils/safeRouter';
import { registerMobileQueryClient } from '../src/lib/mobileMemoryMaintenance';
import { MobileNavigationStability } from '../src/components/common/MobileNavigationStability';

initMobileSentry();
installMobileRuntimeGuards();
installMobileSessionStability();

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / OEM : keep-awake parfois indisponible — éviter promesse rejetée non gérée */
});

const reportRuntimeError = (source: string, err: unknown) => {
  const asError = err instanceof Error ? err : new Error(String(err ?? 'unknown error'));
  captureSentryException(asError, { source });
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    devLog(`[${source}]`, asError.message);
  }
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      reportRuntimeError('react-query.query', error);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const key = Array.isArray(query.queryKey) ? query.queryKey.join(':') : String(query.queryKey ?? '');
        devLog('[react-query.query.key]', key);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      reportRuntimeError('react-query.mutation', error);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const key = Array.isArray(mutation.options.mutationKey)
          ? mutation.options.mutationKey.join(':')
          : String(mutation.options.mutationKey ?? '');
        if (key) devLog('[react-query.mutation.key]', key);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      /** Libère les requêtes inactives — limite la RAM après navigation (Menu+, modules…). */
      gcTime: 5 * 60 * 1000,
    },
  },
});

registerMobileQueryClient(queryClient);

function RootLayoutContent() {
  const { colors, mode } = useAppTheme();
  const { loadStoredAuth } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { effectiveDataSaver } = useDataSaver();

  /** Évite un double `router.push` si cold start + listener reçoivent la même notif d’appel. */
  const lastHandledIncomingCallIdRef = useRef<string | null>(null);

  const tryOpenIncomingCallFromPush = useCallback((data: Record<string, unknown> | undefined) => {
    if (!data || String(data.type || '') !== 'call_incoming') return false;
    const callId = String(data.callId || data.reference_id || '').trim();
    if (!callId) return false;
    if (lastHandledIncomingCallIdRef.current === callId) return true;
    const opened = navigateToIncomingCallFromPush(data);
    if (opened) lastHandledIncomingCallIdRef.current = callId;
    return opened;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) lastHandledIncomingCallIdRef.current = null;
  }, [isAuthenticated]);

  /** Android dev : probe LAN (MEmu) si pas d’URL explicite ; sinon pas d’écran noir global avant la stack. */
  const [androidDevBackendProbeDone, setAndroidDevBackendProbeDone] = useState(() => {
    if (!(Platform.OS === 'android' && typeof __DEV__ !== 'undefined' && __DEV__)) {
      return true;
    }
    return !shouldBlockUiUntilAndroidDevBackendProbe();
  });

  useEffect(() => {
    if (!(Platform.OS === 'android' && typeof __DEV__ !== 'undefined' && __DEV__)) return;

    const finishProbe = () => setAndroidDevBackendProbeDone(true);
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;
    if (shouldBlockUiUntilAndroidDevBackendProbe()) {
      safetyTimeout = setTimeout(finishProbe, 15000);
    }

    void probeAndroidDevBackendOrigin().finally(() => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
      finishProbe();
    });

    return () => {
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, []);

  /**
   * Pre-warm backend prod au boot de l'app : Render free tier dort après 15 min d'inactivité ;
   * un GET /health en background réveille le serveur AVANT que l'utilisateur ne tente une action.
   * Best-effort, ne bloque pas l'UI. Cf. `src/api/backendWarmup.ts` pour la logique de retry.
   */
  useEffect(() => {
    startBackendWarmupAtBoot();
  }, []);

  /**
   * Persistance session (Expo / React Native) : au retour au premier plan, relire SecureStore / AsyncStorage
   * pour garder `useAuthStore` aligné avec le disque (tokens rafraîchis ailleurs, restauration OS, etc.).
   *
   * PERF : throttle 5 min — sur 3G/4G instable, l'utilisateur revient souvent au premier plan
   * (notifications, multitâche). Relire SecureStore + appel API à chaque foreground = latence
   * + saccade visible avant que l'écran ne réagisse. 5 min suffit pour rattraper un refresh externe.
   */
  const appStateRef = useRef(AppState.currentState);
  const lastAuthReloadRef = useRef(0);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === 'active' && (prev === 'background' || prev === 'inactive')) {
        const now = Date.now();
        if (now - lastAuthReloadRef.current < 5 * 60 * 1000) return;
        lastAuthReloadRef.current = now;
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
        safeRouterPush(r);
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
        safeRouterPush({ pathname, params });
      } catch {
        safeRouterPush(pathname);
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
    uploadRecoveryService.start();
    // CallKit iOS + Notifee Android pour appels entrants en background
    void initIncomingCallService();
    void initVoipPushService();
    const offIncomingSocket = wireIncomingCallSocket();
    const offGroupInvite = wireGroupCallParticipantInvite();

    // Notif "ami en live" - écoute socket + affiche notif locale + tap = ouvre live
    let offLiveStarted: (() => void) | null = null;
    void initLiveStartedNotifService().then((cleanup) => {
      offLiveStarted = cleanup;
    });

    // Intercepte les push FCM/APNs `incoming_call` → réveille Notifee Android / CallKit iOS
    let offPushReceived: (() => void) | null = null;
    void notificationService
      .onNotificationReceived((notif) => {
        const data = (notif?.request?.content?.data || {}) as Record<string, unknown>;
        if (data?.type !== 'incoming_call' && data?.type !== 'call_incoming') return;
        const callId = String(data.callId || data.call_id || '');
        if (!callId) return;
        /** App au premier plan : overlay socket gère déjà l’UI — évite double Notifee/CallKit. */
        if (AppState.currentState === 'active') return;
        void displayIncomingCall({
          callId,
          callerName: String(data.callerName || data.caller_name || 'Contact'),
          callerAvatar: data.callerAvatar ? String(data.callerAvatar) : undefined,
          callerUserId: String(data.fromUserId || data.from_user_id || ''),
          fromUserId: String(data.fromUserId || data.from_user_id || ''),
          type: String(data.callType || data.call_type || 'audio') === 'video' ? 'video' : 'audio',
        });
      })
      .then((sub) => {
        offPushReceived = () => sub.remove();
      });

    void Linking.getInitialURL().then((url) => handleIncomingUrl(url));

    let subscription: { remove: () => void } | null = null;
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });
    void notificationService
      .onNotificationResponse((response) => {
        const data = response.notification.request.content.data as
          | {
              type?: string;
              conversationId?: string;
              videoId?: string;
              reference_type?: string;
              reference_id?: string;
              callId?: string;
              callerId?: string;
              callMediaType?: string;
              callerName?: string;
              callerAvatar?: string;
            }
          | undefined;
        if (
          navigateFromStarBookingNotification({
            type: data?.type,
            reference_type: data?.reference_type,
            reference_id: data?.reference_id,
          })
        ) {
          return;
        }
        if (tryOpenIncomingCallFromPush(data as Record<string, unknown> | undefined)) {
          return;
        }
        if (data?.type === 'message' && data?.conversationId) {
          safeRouterPush({ pathname: '/messages/[id]', params: { id: data.conversationId } });
        } else if (data?.type === 'mention' && data?.videoId) {
          safeRouterPush({ pathname: '/watch/[id]', params: { id: data.videoId } });
        } else if (data?.type === 'like' || data?.type === 'follow' || data?.type === 'comment') {
          safeRouterPush('/notifications');
        }
      })
      .then((sub) => {
        subscription = sub;
      })
      .catch(() => {
        /* Web / chunk expo-notifications indisponible : non bloquant */
      });

    return () => {
      subscription?.remove();
      urlSubscription.remove();
      offlineSyncCleanup?.();
      uploadRecoveryService.stop();
      offIncomingSocket?.();
      offGroupInvite?.();
      offPushReceived?.();
      offLiveStarted?.();
    };
  }, [loadStoredAuth, tryOpenIncomingCallFromPush]);

  /** App ouverte depuis une notification d’appel (app tuée ou arrière-plan). */
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web' || isExpoGoApp()) return;
    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!last?.notification) return;
        const data = last.notification.request.content.data as Record<string, unknown>;
        tryOpenIncomingCallFromPush(data);
      } catch {
        /* module ou réponse indisponible */
      }
    })();
  }, [isAuthenticated, tryOpenIncomingCallFromPush]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void notificationService.syncPushTokenWithBackend();
  }, [isAuthenticated]);

  /** Pré-cache hors ligne au boot / reconnexion — Wi‑Fi uniquement (forfait : scroll feed gère le warm minimal). */
  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated) return undefined;
    const runBootstrap = () => {
      void NetInfo.fetch().then((state) => {
        const cellular = state.type === 'cellular';
        if (!shouldBootstrapOfflineCacheOnLaunch(cellular)) return;
        void feedVideoOfflineCache.bootstrapOfflineCacheOnLaunch(effectiveDataSaver, cellular);
      });
    };
    runBootstrap();
    const sub = NetInfo.addEventListener((state) => {
      if (state.isConnected !== true && state.isInternetReachable !== true) return;
      const cellular = state.type === 'cellular';
      if (!shouldBootstrapOfflineCacheOnLaunch(cellular)) return;
      void feedVideoOfflineCache.bootstrapOfflineCacheOnLaunch(effectiveDataSaver, cellular);
    });
    return () => sub();
  }, [isAuthenticated, effectiveDataSaver]);

  /**
   * Connecte le socket Socket.IO dès qu'on a un access token, pour recevoir
   * les invitations d'appel (`call:invite`), les nouveaux messages, présences, etc.
   * Émet `user:join` après authentification → déclenche `broadcastPresence(true)`
   * côté backend, pour que les contacts voient le point vert "en ligne".
   */
  const accessToken = useAuthStore((s) => s.accessToken);
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) return;
    const userName = user.username ?? undefined;
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
  }, [isAuthenticated, accessToken, user?.id, user?.username]);

  /** Socket : rejoin room au retour au premier plan (appels entrants manqués après veille / transport close). */
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user?.id) return;
    const userName = user.username ?? undefined;
    const rejoin = () => {
      socketService.ensureUserRoomJoined(user.id, userName);
    };
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') rejoin();
    });
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', rejoin);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', rejoin);
      }
    };
  }, [isAuthenticated, accessToken, user?.id, user?.username]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    void import('../src/services/e2eeMobileService')
      .then(async (m) => {
        try {
          if (typeof m.ensureE2eeBootstrap === 'function') {
            await m.ensureE2eeBootstrap(user.id);
          }
        } catch {
          /* import ou bootstrap : ne jamais faire planter l’app (web + fetchThenEval) */
        }
      })
      .catch(() => {
        /* chunk E2EE indisponible : non bloquant */
      });
  }, [isAuthenticated, user?.id]);

  if (!androidDevBackendProbeDone) {
    return <View style={[styles.fill, { backgroundColor: '#000' }]} />;
  }

  return (
    <AppRootErrorBoundary>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <View style={[styles.fill, { backgroundColor: colors.background, overflow: 'hidden' }]}>
            <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
            <OfflineBanner />
            <AppUpdatePrompt />
            <IncomingCallOverlay />
            <InCallFloatingBar />
            <MobileNavigationStability />
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
            <Stack.Screen name="alert-mali" />
            <Stack.Screen name="data-protection" />
            <Stack.Screen name="admin-dashboard" />
            <Stack.Screen name="admin-settings" />
            <Stack.Screen name="badges-profile" />
            <Stack.Screen name="leaderboard" />
            <Stack.Screen name="gamification-hub" />
          </Stack>
            <AgoraDmLocalPreviewOverlay />
          </View>
        </ToastProvider>
      </QueryClientProvider>
    </LanguageProvider>
    </AppRootErrorBoundary>
  );
}

export default function RootLayout() {
  const iconFontMap = useMemo(
    () => ({
      ...Ionicons.font,
      ...MaterialCommunityIcons.font,
    }),
    []
  );
  const [iconFontsLoaded, iconFontError] = useFonts(iconFontMap);

  useEffect(() => {
    if (iconFontsLoaded || iconFontError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [iconFontsLoaded, iconFontError]);

  if (!iconFontsLoaded && !iconFontError) {
    return (
      <GestureHandlerRootView style={styles.fill}>
        <View style={[styles.fill, { backgroundColor: '#000' }]} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DataSaverProvider>
            <RootLayoutContent />
          </DataSaverProvider>
        </ThemeProvider>
      </SafeAreaProvider>
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
