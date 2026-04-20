import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { registerMobilePushToken } from './mobileApiService';
import { secureStorage } from '../utils/secureStorage';

type ExpoNotifications = typeof import('expo-notifications');

const isExpoGo = Constants.appOwnership === 'expo';

/** Placeholder dans app.json tant que le vrai `eas.projectId` n’est pas configuré. */
const PLACEHOLDER_EAS_PROJECT_ID = '00000000-0000-4000-8000-000000000000';

function resolveExpoProjectId(): string | null {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const id = typeof projectId === 'string' ? projectId.trim() : '';
  if (!id || id === PLACEHOLDER_EAS_PROJECT_ID) return null;
  return id;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private handlerConfigured = false;
  private notificationsMod: ExpoNotifications | null = null;

  /** Ne charge pas expo-notifications dans Expo Go (SDK 53+ : push retiré + erreurs au chargement du module). */
  private async loadNotifications(): Promise<ExpoNotifications | null> {
    if (isExpoGo && Platform.OS !== 'web') {
      return null;
    }
    if (this.notificationsMod) return this.notificationsMod;
    const mod = await import('expo-notifications');
    this.notificationsMod = mod;
    if (!this.handlerConfigured) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      this.handlerConfigured = true;
    }
    return mod;
  }

  async initialize() {
    try {
      if (Platform.OS === 'web') {
        console.log(
          '[Notifications] Web: push distant ignoré (ajoutez notification.vapidPublicKey dans app.json pour activer).',
        );
        return null;
      }

      if (isExpoGo) {
        console.log(
          '[Notifications] Expo Go: push distant désactivé (SDK 53+). Utilisez un development build pour FCM / projectId.',
        );
        return null;
      }

      const Notifications = await this.loadNotifications();
      if (!Notifications) return null;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
      }

      const projectId = resolveExpoProjectId();
      if (!projectId) {
        console.log('[Notifications] Pas de projectId EAS valide (extra.eas.projectId) — skip token Expo Push.');
      } else {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        this.expoPushToken = tokenData.data;
        console.log('[Notifications] Push token:', this.expoPushToken);
        await this.registerToken(this.expoPushToken);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'AfriWonder',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B00',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });
      }

      return this.expoPushToken;
    } catch (err) {
      console.log('[Notifications] Init error:', err);
      return null;
    }
  }

  async registerToken(token: string) {
    try {
      await registerMobilePushToken(token, Platform.OS);
    } catch (err) {
      console.log('[Notifications] Token registration error:', err);
    }
  }

  /**
   * Après login / restauration session : le token Expo peut avoir été obtenu avant le JWT.
   * Ré-enregistre sur le backend dès qu’un accessToken est disponible.
   */
  async syncPushTokenWithBackend(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      if (isExpoGo) return;

      const access = (await secureStorage.getItem('accessToken'))?.trim();
      if (!access) return;

      await this.ensureDevicePushToken();
      if (!this.expoPushToken) return;

      await this.registerToken(this.expoPushToken);
    } catch (err) {
      console.log('[Notifications] syncPushTokenWithBackend:', err);
    }
  }

  /** Récupère le token Expo Push si permissions OK (sans redemander si déjà en mémoire). */
  private async ensureDevicePushToken(): Promise<void> {
    if (this.expoPushToken) return;

    const Notifications = await this.loadNotifications();
    if (!Notifications) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = resolveExpoProjectId();
    if (!projectId) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.expoPushToken = tokenData.data;
    } catch (err) {
      console.log('[Notifications] ensureDevicePushToken:', err);
    }
  }

  async scheduleLocal(title: string, body: string, data?: any, seconds: number = 0) {
    try {
      const Notifications = await this.loadNotifications();
      if (!Notifications) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger:
          seconds > 0 ? { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL } : null,
      });
    } catch (err) {
      console.log('[Notifications] Schedule error:', err);
    }
  }

  async notifyNewMessage(senderName: string, message: string, conversationId: string) {
    await this.scheduleLocal(senderName, message, { type: 'message', conversationId });
  }

  async notifyLike(userName: string, contentType: string) {
    await this.scheduleLocal('Nouveau j\'aime', `${userName} a aime votre ${contentType}`, { type: 'like' });
  }

  async notifyFollow(userName: string) {
    await this.scheduleLocal('Nouvel abonne', `${userName} vous suit maintenant`, { type: 'follow' });
  }

  async getBadgeCount(): Promise<number> {
    const Notifications = await this.loadNotifications();
    if (!Notifications) return 0;
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    const Notifications = await this.loadNotifications();
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  }

  async clearAll() {
    const Notifications = await this.loadNotifications();
    if (!Notifications) return;
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  async onNotificationReceived(
    callback: (notification: import('expo-notifications').Notification) => void,
  ): Promise<{ remove: () => void }> {
    const Notifications = await this.loadNotifications();
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationReceivedListener(callback);
  }

  async onNotificationResponse(
    callback: (response: import('expo-notifications').NotificationResponse) => void,
  ): Promise<{ remove: () => void }> {
    const Notifications = await this.loadNotifications();
    if (!Notifications) return { remove: () => {} };
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  get token() {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
