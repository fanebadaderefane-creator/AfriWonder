export class PushNotificationService {
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
