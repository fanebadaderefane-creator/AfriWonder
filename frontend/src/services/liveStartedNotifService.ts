/**
 * liveStartedNotifService.ts
 *
 * Quand un créateur que je SUIS démarre un live, je reçois :
 *  - Une notification push (déjà envoyée par le backend via notification.service)
 *  - Un event socket `live:started` (relay temps réel)
 *
 * Ce service écoute le socket et :
 *  - Si app foreground : toast en haut de l'écran + son discret
 *  - Si app background : affiche notif via Notifee (Android) ou via expo-notifications (iOS)
 *  - Tap sur la notif → ouvre /live/[id]
 */
import { Platform, AppState } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { router } from 'expo-router';
import socketService from './socketService';
import { devLog, devWarn } from '../utils/devLog';
import apiClient from '../api/client';

const LIVE_CHANNEL_ID = 'afriwonder-live-bell';
let initialized = false;
let toastListener: ((data: LiveStartedPayload) => void) | null = null;

export type LiveStartedPayload = {
  streamId: string;
  creatorId: string;
  creatorName?: string;
  creatorAvatar?: string;
  title?: string;
  roomId?: string;
};

/** Liste des créateurs que je suis + bell activée (cached). */
let followedBellSet: Set<string> = new Set();

async function refreshFollowedBell(): Promise<void> {
  try {
    const res = await apiClient.get('/live/bell/subscriptions');
    const data = res.data?.data ?? res.data;
    const ids: string[] = Array.isArray(data?.creator_ids)
      ? data.creator_ids
      : Array.isArray(data)
        ? data.map((x: any) => x?.creator_id || x?.id).filter(Boolean)
        : [];
    followedBellSet = new Set(ids.map(String));
    devLog('[LiveStartedNotif] Bell creators:', followedBellSet.size);
  } catch {
    /* endpoint optionnel — silent fail */
  }
}

export function setLiveStartedToastListener(fn: ((data: LiveStartedPayload) => void) | null) {
  toastListener = fn;
}

export async function initLiveStartedNotifService(): Promise<() => void> {
  if (Platform.OS === 'web') return () => {};

  if (!initialized) {
    try {
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: LIVE_CHANNEL_ID,
          name: 'Amis en live',
          importance: AndroidImportance.DEFAULT,
          sound: 'default',
          vibration: true,
        });
      }
    } catch (e) {
      devWarn('[LiveStartedNotif] Channel init failed', e);
    }
    initialized = true;
  }

  void refreshFollowedBell();

  const handler = async (data: LiveStartedPayload) => {
    if (!data?.streamId) return;
    const creatorId = String(data.creatorId || '');
    // Si je n'ai pas activé la bell pour ce créateur, on ignore (le push backend gère le reste)
    if (creatorId && followedBellSet.size > 0 && !followedBellSet.has(creatorId)) return;

    if (AppState.currentState === 'active' && toastListener) {
      toastListener(data);
      return;
    }

    // App background ou pas de listener : notif locale
    try {
      await notifee.displayNotification({
        id: `live-${data.streamId}`,
        title: data.creatorName ? `${data.creatorName} est en live !` : 'Un ami est en live',
        body: data.title || 'Tapez pour rejoindre',
        data: {
          type: 'live_started',
          streamId: data.streamId,
        },
        android: {
          channelId: LIVE_CHANNEL_ID,
          smallIcon: 'ic_notification',
          color: '#FF6B00',
          largeIcon: data.creatorAvatar || undefined,
          pressAction: { id: 'default', launchActivity: 'default' },
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (e) {
      devWarn('[LiveStartedNotif] Display failed', e);
    }
  };

  socketService.on?.('live:started', handler);

  // Tap sur la notif → ouvre le live
  const cleanupNotifEvents = notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS) return;
    const data = detail.notification?.data;
    if (data?.type !== 'live_started') return;
    const sid = String(data.streamId || '');
    if (!sid) return;
    try {
      router.push({ pathname: '/live/[id]', params: { id: sid } } as never);
    } catch {
      /* ignore */
    }
  });
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.PRESS) return;
    const data = detail.notification?.data;
    if (data?.type !== 'live_started') return;
    const sid = String(data.streamId || '');
    if (sid) {
      try {
        router.push({ pathname: '/live/[id]', params: { id: sid } } as never);
      } catch {
        /* ignore */
      }
    }
  });

  return () => {
    socketService.off?.('live:started', handler);
    cleanupNotifEvents?.();
  };
}
