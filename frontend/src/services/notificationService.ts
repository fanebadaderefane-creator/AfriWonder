import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isExpoGoApp } from '../config/expoRuntime';
import { isGoogleMobileServicesReady } from '../lib/googlePlayServices';
import { registerMobilePushToken } from './mobileApiService';
import { secureStorage } from '../utils/secureStorage';
import { devLog } from '../utils/devLog';

type ExpoNotifications = typeof import('expo-notifications');

const isExpoGo = isExpoGoApp();

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

  /**
   * Web : pas de module push natif (voir `initialize`). Sans retour hâtif ici, `import('expo-notifications')`
   * au boot via `onNotificationResponse` dans `_layout` peut échouer (chunk async) → rejection non gérée + overlay rouge.
   * Expo Go natif : SDK 53+ push retiré / erreurs au chargement du module.
   */
  private async loadNotifications(): Promise<ExpoNotifications | null> {
    if (Platform.OS === 'web') return null;
    if (isExpoGo) return null;
    if (this.notificationsMod) return this.notificationsMod;
    try {
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
    } catch (err) {
      devLog('[Notifications] loadNotifications:', err);
      return null;
    }
  }

  async initialize() {
    try {
      if (Platform.OS === 'web') {
        devLog(
          '[Notifications] Web: push distant ignoré (ajoutez notification.vapidPublicKey dans app.json pour activer).',
        );
        return null;
      }

      if (isExpoGo) {
        devLog(
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
        devLog('[Notifications] Permission not granted');
        return null;
      }

      const projectId = resolveExpoProjectId();
      const gmsReady = Platform.OS !== 'android' || (await isGoogleMobileServicesReady());
      if (!gmsReady) {
        devLog('[Notifications] GMS absent — canaux locaux uniquement, pas de token FCM.');
      } else if (!projectId) {
        devLog('[Notifications] Pas de projectId EAS valide (extra.eas.projectId) — skip token Expo Push.');
      } else {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        this.expoPushToken = tokenData.data;
        devLog('[Notifications] Push token:', this.expoPushToken);
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

        await Notifications.setNotificationChannelAsync('calls', {
          name: 'Appels',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 400, 250, 400],
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      return this.expoPushToken;
    } catch (err) {
      devLog('[Notifications] Init error:', err);
      return null;
    }
  }

  async registerToken(token: string) {
    try {
      await registerMobilePushToken(token, Platform.OS);
    } catch (err) {
      devLog('[Notifications] Token registration error:', err);
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
      devLog('[Notifications] syncPushTokenWithBackend:', err);
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
    if (Platform.OS === 'android' && !(await isGoogleMobileServicesReady())) return;

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      this.expoPushToken = tokenData.data;
    } catch (err) {
      devLog('[Notifications] ensureDevicePushToken:', err);
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
      devLog('[Notifications] Schedule error:', err);
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
