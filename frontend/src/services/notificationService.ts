import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import mobileApiClient from '../api/mobileClient';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  async initialize() {
    try {
      // Request permissions
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

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      this.expoPushToken = tokenData.data;
      console.log('[Notifications] Push token:', this.expoPushToken);

      // Register token with backend
      await this.registerToken(this.expoPushToken);

      // Configure Android channel
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
      await mobileApiClient.post('/mobile/push-token', { token, platform: Platform.OS });
    } catch (err) {
      console.log('[Notifications] Token registration error:', err);
    }
  }

  // Schedule a local notification
  async scheduleLocal(title: string, body: string, data?: any, seconds: number = 0) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: seconds > 0 ? { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL } : null,
      });
    } catch (err) {
      console.log('[Notifications] Schedule error:', err);
    }
  }

  // Show notification for new message
  async notifyNewMessage(senderName: string, message: string, conversationId: string) {
    await this.scheduleLocal(
      senderName,
      message,
      { type: 'message', conversationId },
    );
  }

  // Show notification for like
  async notifyLike(userName: string, contentType: string) {
    await this.scheduleLocal(
      'Nouveau j\'aime',
      `${userName} a aime votre ${contentType}`,
      { type: 'like' },
    );
  }

  // Show notification for follow
  async notifyFollow(userName: string) {
    await this.scheduleLocal(
      'Nouvel abonne',
      `${userName} vous suit maintenant`,
      { type: 'follow' },
    );
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAll() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  // Add notification listeners
  onNotificationReceived(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  onNotificationResponse(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  get token() {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
