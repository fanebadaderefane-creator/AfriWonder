/**
 * voipPushService.ts
 *
 * iOS PushKit (VoIP push) handler — réveille l'app même tuée pour les appels entrants.
 *
 * Workflow :
 *  1. Au login → enregistre le device pour VoIP push
 *  2. iOS génère un token VoIP (différent du token APNs normal)
 *  3. On envoie ce token au backend via /calls/voip-token
 *  4. Quand le caller initie un appel, backend envoie push à api.push.apple.com sur ce token
 *  5. iOS réveille l'app (même killed) → handler reçoit le payload → affiche CallKit
 *
 * NOTE : iOS 13+ exige que l'app appelle CallKit `reportNewIncomingCall` dans les 5s
 * sinon iOS tue l'app et bloque les VoIP push futurs. C'est ce qu'on fait via
 * displayIncomingCall() de incomingCallService.
 *
 * Android : non concerné, on utilise FCM data-only (expo-notifications + Notifee).
 */
import { Platform } from 'react-native';
import { devLog, devWarn } from '../utils/devLog';
import apiClient from '../api/client';
import { displayIncomingCall } from './incomingCallService';

let voipModule: any = null;
let initialized = false;
let lastToken: string | null = null;

function getVoipPushModule(): any {
  if (voipModule) return voipModule;
  if (Platform.OS !== 'ios') return null;
  try {
    voipModule = require('react-native-voip-push-notification').default
      || require('react-native-voip-push-notification');
    return voipModule;
  } catch {
    return null;
  }
}

export async function initVoipPushService(): Promise<void> {
  if (initialized) return;
  if (Platform.OS !== 'ios') {
    initialized = true;
    return;
  }
  const VoipPushNotification = getVoipPushModule();
  if (!VoipPushNotification) {
    devWarn('[VoipPush] Module non disponible (Expo Go ou non installé)');
    return;
  }

  try {
    // Demande le token VoIP
    VoipPushNotification.addEventListener('register', (token: string) => {
      if (!token || token === lastToken) return;
      lastToken = token;
      devLog('[VoipPush] Token reçu', token.slice(0, 12) + '...');
      void apiClient
        .post('/calls/voip-token', { token, platform: 'ios' })
        .catch((e) => devWarn('[VoipPush] Sync token failed', e?.message));
    });

    // Reçoit le push d'appel entrant (app foreground, background OU killed)
    VoipPushNotification.addEventListener('notification', (notification: Record<string, any>) => {
      const payload = notification || {};
      const callId = String(payload.callId || payload.uuid || '');
      const callerName = String(payload.callerName || payload.handle || 'Contact');
      const callerAvatar = String(payload.callerAvatar || '');
      const fromUserId = String(payload.fromUserId || payload.callerUserId || '');
      const type = String(payload.type || 'audio') === 'video' ? 'video' : 'audio';
      if (!callId) {
        devWarn('[VoipPush] Push sans callId, ignoré', payload);
        return;
      }
      // IMPORTANT iOS : displayIncomingCall doit appeler reportNewIncomingCall < 5s
      void displayIncomingCall({
        callId,
        callerName,
        callerAvatar,
        callerUserId: fromUserId,
        fromUserId,
        type,
      });
    });

    VoipPushNotification.addEventListener('didLoadWithEvents', (events: any[]) => {
      if (!Array.isArray(events)) return;
      events.forEach((evt) => {
        if (evt.name === 'RNVoipPushRemoteNotificationsRegisteredEvent') {
          const token = evt.data;
          if (token && token !== lastToken) {
            lastToken = token;
            void apiClient
              .post('/calls/voip-token', { token, platform: 'ios' })
              .catch(() => {});
          }
        } else if (evt.name === 'RNVoipPushRemoteNotificationReceivedEvent') {
          const payload = evt.data || {};
          const callId = String(payload.callId || payload.uuid || '');
          if (callId) {
            void displayIncomingCall({
              callId,
              callerName: String(payload.callerName || 'Contact'),
              callerAvatar: String(payload.callerAvatar || ''),
              callerUserId: String(payload.fromUserId || ''),
              fromUserId: String(payload.fromUserId || ''),
              type: String(payload.type || 'audio') === 'video' ? 'video' : 'audio',
            });
          }
        }
      });
    });

    // Déclenche la registration auprès d'APNs PushKit
    VoipPushNotification.registerVoipToken();
    initialized = true;
    devLog('[VoipPush] Service initialisé');
  } catch (e) {
    devWarn('[VoipPush] Init failed', e);
  }
}

export async function syncVoipTokenIfAvailable(): Promise<void> {
  if (Platform.OS !== 'ios' || !lastToken) return;
  try {
    await apiClient.post('/calls/voip-token', { token: lastToken, platform: 'ios' });
  } catch {
    /* ignore */
  }
}
