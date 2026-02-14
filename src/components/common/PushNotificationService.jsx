import { api } from '@/api/expressClient';

export class PushNotificationService {
  static async getNotificationPreference(userId) {
    try {
      const existing = await api.entities?.NotificationPreference?.filter?.({ user_id: userId });
      return existing?.[0] ?? null;
    } catch {
      return null;
    }
  }

  static async updateNotificationPreference(userId, prefs) {
    const existing = await this.getNotificationPreference(userId);
    if (existing?.id) {
      await api.entities.NotificationPreference.update(existing.id, prefs);
    } else {
      await api.entities.NotificationPreference.create({ user_id: userId, ...prefs });
    }
  }

  static async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (_error) {
        console.error('Erreur lors de la demande de permission');
        return false;
      }
    }

    return false;
  }

  static async subscribe(_userId) {
    // TODO: Implement push notification subscription
    return true;
  }

  static async sendNotification(title, options = {}) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/AfriWonder%20logo.png',
          badge: '/badge.png',
          ...options
        });
      } catch (_error) {
        console.error('Erreur notification');
      }
    }
  }
}

export default PushNotificationService;
