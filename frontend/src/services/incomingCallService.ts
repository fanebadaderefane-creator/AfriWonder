/**
 * incomingCallService.ts
 *
 * Service unifié pour gérer les appels entrants en background :
 *  - iOS : CallKit via react-native-callkeep (popup natif système, même app killed)
 *  - Android : Notifee full-screen intent (notification haute priorité avec sonnerie)
 *
 * Wiring :
 *  - À l'init de l'app (`_layout.tsx`), appeler `initIncomingCallService()`.
 *  - Quand un event socket `call:invite` arrive, appeler `displayIncomingCall(payload)`.
 *  - L'utilisateur accepte/refuse depuis la notif → callback `onAnswer` / `onReject`.
 *
 * Notes :
 *  - Ne fonctionne pas sur Expo Go (modules natifs). Build EAS dev-client requis.
 *  - Sur Android, l'app doit être en foreground OU avoir un service foreground actif
 *    pour réveiller la notif si killed. Pour app killed, il faut un push FCM data-only
 *    qui réveille la JS thread via headless task — à câbler avec votre backend Render.
 */
import { Platform, AppState } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  AndroidForegroundServiceType,
  EventType,
} from '@notifee/react-native';
import { getCallKeep } from './callKeepIos';
import { navigateToReceiverCallScreen } from '../call/openNativeCallScreen';
import socketService from './socketService';
import { devLog, devWarn } from '../utils/devLog';
import { useAuthStore } from '../store/authStore';
import { ANDROID_INCOMING_CALL_VIBRATION_PATTERN } from '../call/callIncomingAlerts';
import { buildCallDeclinePayload } from '../call/callSignalingPayload';

const ANDROID_CHANNEL_ID = 'afriwonder-incoming-call';
const ANDROID_CHANNEL_NAME = 'Appels entrants AfriWonder';
const ANDROID_ACTIVE_CALL_CHANNEL_ID = 'afriwonder-active-call';
const ANDROID_ACTIVE_CALL_NOTIF_ID = 'afriwonder-active-call-session';

const IOS_CALLKEEP_OPTIONS = {
  ios: {
    appName: 'AfriWonder',
    supportsVideo: true,
    imageName: 'CallKitIcon',
    includesCallsInRecents: false,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
  },
  android: {
    alertTitle: 'Permissions requises',
    alertDescription: 'AfriWonder a besoin de la permission pour afficher les appels entrants.',
    cancelButton: 'Annuler',
    okButton: 'OK',
    additionalPermissions: [],
    foregroundService: {
      channelId: ANDROID_CHANNEL_ID,
      channelName: ANDROID_CHANNEL_NAME,
      notificationTitle: 'AfriWonder est actif',
      notificationIcon: 'ic_notification',
    },
  },
};

export type IncomingCallPayload = {
  callId: string;
  callerName: string;
  callerAvatar?: string;
  callerUserId: string;
  type: 'audio' | 'video';
  /** ID du calleur pour signalisation socket */
  fromUserId: string;
};

let initialized = false;
const activeCallIds = new Set<string>();

/**
 * À appeler une seule fois au démarrage de l'app (dans _layout.tsx).
 */
export async function initIncomingCallService(): Promise<void> {
  if (initialized) return;
  if (Platform.OS === 'web') {
    initialized = true;
    return;
  }

  try {
    if (Platform.OS === 'android') {
      // Permission notif Android 13+
      await notifee.requestPermission();

      // Channel obligatoire pour full-screen intent
      await notifee.createChannel({
        id: ANDROID_CHANNEL_ID,
        name: ANDROID_CHANNEL_NAME,
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
        vibrationPattern: [...ANDROID_INCOMING_CALL_VIBRATION_PATTERN],
        /** Respecte le mode « Ne pas déranger » — l’utilisateur peut autoriser les appels dans les réglages système. */
        bypassDnd: false,
        visibility: AndroidVisibility.PUBLIC,
      });

      // Listener actions notif (accept / decline)
      notifee.onBackgroundEvent(async ({ type, detail }) => {
        await handleNotifeeEvent(type, detail);
      });
      notifee.onForegroundEvent(async ({ type, detail }) => {
        await handleNotifeeEvent(type, detail);
      });
    }

    if (Platform.OS === 'ios') {
      const callKeep = getCallKeep();
      if (callKeep) {
        await callKeep.setup(IOS_CALLKEEP_OPTIONS);
        callKeep.setAvailable(true);

        // Listeners CallKit
        callKeep.addEventListener('answerCall', ({ callUUID }: { callUUID: string }) => {
          onCallKeepAnswer(callUUID);
        });
        callKeep.addEventListener('endCall', ({ callUUID }: { callUUID: string }) => {
          onCallKeepEnd(callUUID);
        });
        callKeep.addEventListener(
          'didPerformSetMutedCallAction',
          ({ muted, callUUID }: { muted: boolean; callUUID: string }) => {
            devLog('[CallKeep] Mute toggle', callUUID, muted);
          },
        );
      } else {
        devWarn('[IncomingCall] CallKeep indisponible sur iOS');
      }
    }

    initialized = true;
    devLog('[IncomingCall] Service initialisé pour', Platform.OS);
  } catch (e) {
    devWarn('[IncomingCall] Init failed', e);
  }
}

const pendingCalls = new Map<string, IncomingCallPayload>();

export async function displayIncomingCall(payload: IncomingCallPayload): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!initialized) await initIncomingCallService();
  if (activeCallIds.has(payload.callId)) return;
  activeCallIds.add(payload.callId);
  pendingCalls.set(payload.callId, payload);

  try {
    if (Platform.OS === 'ios') {
      const callKeep = getCallKeep();
      if (!callKeep) return;
      const handle = payload.callerUserId || payload.callId;
      callKeep.displayIncomingCall(
        payload.callId,
        handle,
        payload.callerName,
        'generic',
        payload.type === 'video',
      );
    } else {
      // Android : notification full-screen haute priorité
      await notifee.displayNotification({
        id: payload.callId,
        title: payload.callerName,
        body: payload.type === 'video' ? 'Appel vidéo entrant' : 'Appel audio entrant',
        data: {
          type: 'incoming_call',
          callId: payload.callId,
          fromUserId: payload.fromUserId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar || '',
          callType: payload.type,
        },
        android: {
          channelId: ANDROID_CHANNEL_ID,
          category: AndroidCategory.CALL,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_notification',
          color: '#FF6B00',
          largeIcon: payload.callerAvatar || undefined,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'default',
          },
          actions: [
            {
              title: 'Refuser',
              pressAction: { id: 'decline_call' },
            },
            {
              title: 'Repondre',
              pressAction: { id: 'answer_call', launchActivity: 'default' },
            },
          ],
          sound: 'default',
          /** Pas de sonnerie système en boucle — l’overlay (app ouverte) gère le motif pulsé. */
          loopSound: false,
          vibrationPattern: [...ANDROID_INCOMING_CALL_VIBRATION_PATTERN],
          lightUpScreen: true,
        },
      });
    }
  } catch (e) {
    devWarn('[IncomingCall] Display failed', e);
    activeCallIds.delete(payload.callId);
    pendingCalls.delete(payload.callId);
  }
}

export async function dismissIncomingCall(callId: string): Promise<void> {
  activeCallIds.delete(callId);
  pendingCalls.delete(callId);
  try {
    if (Platform.OS === 'ios') {
      getCallKeep()?.endCall(callId);
    } else if (Platform.OS === 'android') {
      await notifee.cancelNotification(callId);
    }
  } catch {
    /* ignore */
  }
}

async function handleNotifeeEvent(type: EventType, detail: { notification?: any; pressAction?: any }) {
  const notif = detail.notification;
  if (!notif?.data || notif.data.type !== 'incoming_call') return;
  const callId = String(notif.data.callId || '');
  const callerUserId = String(notif.data.fromUserId || '');
  const myUserId = String(useAuthStore.getState().user?.id || '');
  const callerName = String(notif.data.callerName || 'Contact');
  const callerAvatar = String(notif.data.callerAvatar || '');
  const callType = (String(notif.data.callType || 'audio') === 'video' ? 'video' : 'audio') as 'audio' | 'video';
  const actionId = detail.pressAction?.id || '';

  if (type === EventType.ACTION_PRESS && actionId === 'decline_call') {
    await dismissIncomingCall(callId);
    if (myUserId && callerUserId) {
      void socketService.ensureConnectedEmit(
        'call:decline',
        buildCallDeclinePayload({
          callId,
          declinerUserId: myUserId,
          callerUserId,
          reason: 'declined',
        }),
      );
    }
    return;
  }
  if (
    (type === EventType.ACTION_PRESS && actionId === 'answer_call') ||
    type === EventType.PRESS
  ) {
    await dismissIncomingCall(callId);
    navigateToReceiverCallScreen({
      callId,
      peerUserId: callerUserId,
      peerName: callerName,
      peerAvatar: callerAvatar,
      type: callType,
    });
  }
}

function onCallKeepAnswer(callUUID: string) {
  const payload = pendingCalls.get(callUUID);
  pendingCalls.delete(callUUID);
  activeCallIds.delete(callUUID);
  if (!payload) return;
  navigateToReceiverCallScreen({
    callId: callUUID,
    peerUserId: payload.fromUserId,
    peerName: payload.callerName,
    peerAvatar: payload.callerAvatar || '',
    type: payload.type,
  });
}

function onCallKeepEnd(callUUID: string) {
  const payload = pendingCalls.get(callUUID);
  pendingCalls.delete(callUUID);
  activeCallIds.delete(callUUID);
  if (!payload) return;
  const myUserId = String(useAuthStore.getState().user?.id || '');
  const callerUserId = String(payload.fromUserId || '');
  if (myUserId && callerUserId) {
    void socketService.ensureConnectedEmit(
      'call:decline',
      buildCallDeclinePayload({
        callId: callUUID,
        declinerUserId: myUserId,
        callerUserId,
        reason: 'declined',
      }),
    );
  }
}

/**
 * Branche le service socket à l'event `call:invite` pour afficher la notif
 * dès qu'un appel arrive (app en foreground OU background si push wakelock).
 */
export function wireIncomingCallSocket(): () => void {
  const off = socketService.on?.('call:invite', (data: any) => {
    if (!data || !data.callId) return;
    /**
     * Si l'app est foreground active, on peut afficher directement la modale IncomingCallOverlay
     * (gérée par AppRoot). Sinon, on push une notification full-screen.
     */
    if (AppState.currentState === 'active') {
      // Géré par IncomingCallOverlay en RAM
      return;
    }
    void displayIncomingCall({
      callId: String(data.callId),
      callerName: String(data.callerName || 'Contact'),
      callerAvatar: data.callerAvatar ? String(data.callerAvatar) : undefined,
      callerUserId: String(data.fromUserId || ''),
      fromUserId: String(data.fromUserId || ''),
      type: data.type === 'video' ? 'video' : 'audio',
    });
  });
  return () => off?.();
}

/**
 * Foreground service Android 14+ — garde le micro (et la caméra) actifs en arrière-plan.
 */
export async function startActiveCallForeground(peerName: string, isVideo: boolean): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: ANDROID_ACTIVE_CALL_CHANNEL_ID,
      name: 'Appel en cours',
      importance: AndroidImportance.LOW,
    });
    const fgTypes = isVideo
      ? [
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE,
          AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_CAMERA,
        ]
      : [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE];
    await notifee.displayNotification({
      id: ANDROID_ACTIVE_CALL_NOTIF_ID,
      title: 'Appel en cours',
      body: peerName ? `Avec ${peerName}` : 'AfriWonder',
      android: {
        channelId: ANDROID_ACTIVE_CALL_CHANNEL_ID,
        ongoing: true,
        asForegroundService: true,
        foregroundServiceTypes: fgTypes,
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
      },
    });
  } catch (e) {
    devWarn('[IncomingCall] Active call foreground failed', e);
  }
}

export async function stopActiveCallForeground(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await notifee.stopForegroundService();
    await notifee.cancelNotification(ANDROID_ACTIVE_CALL_NOTIF_ID);
  } catch {
    /* ignore */
  }
}
