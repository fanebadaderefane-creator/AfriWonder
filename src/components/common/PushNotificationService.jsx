import { api } from '@/api/expressClient';

export class PushNotificationService {
  static urlBase64ToUint8Array(base64String) {
    const safe = String(base64String || '').trim();
    const padding = '='.repeat((4 - (safe.length % 4)) % 4);
    const base64 = (safe + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  static arrayBufferToBase64(buffer) {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  }

  static toLegacyPreferences(prefs = {}) {
    const pushEnabled = !!(prefs.push_like || prefs.push_comment || prefs.push_follow || prefs.push_order || prefs.push_live);
    const emailEnabled = !!(prefs.email_like || prefs.email_comment || prefs.email_follow || prefs.email_order || prefs.email_live);
    const smsEnabled = !!(prefs.sms_like || prefs.sms_comment || prefs.sms_order);
    return {
      ...prefs,
      push_enabled: pushEnabled,
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
      social: !!(prefs.push_like || prefs.push_comment || prefs.push_follow),
      messages: !!prefs.push_comment,
      orders: !!prefs.push_order,
      lives: !!prefs.push_live,
      promotions: true,
      tips: true,
    };
  }

  static fromLegacyPreferences(prefs = {}) {
    const pushEnabled = prefs.push_enabled !== false;
    const emailEnabled = prefs.email_enabled !== false;
    const smsEnabled = prefs.sms_enabled === true;
    return {
      push_like: pushEnabled && prefs.social !== false,
      push_comment: pushEnabled && prefs.messages !== false,
      push_follow: pushEnabled && prefs.social !== false,
      push_order: pushEnabled && prefs.orders !== false,
      push_live: pushEnabled && prefs.lives !== false,
      email_like: emailEnabled && prefs.social !== false,
      email_comment: emailEnabled && prefs.social !== false,
      email_follow: emailEnabled && prefs.social !== false,
      email_order: emailEnabled && prefs.orders !== false,
      email_live: emailEnabled && prefs.lives !== false,
      sms_like: smsEnabled && prefs.social !== false,
      sms_comment: smsEnabled && prefs.social !== false,
      sms_order: smsEnabled && prefs.orders !== false,
    };
  }

  static async getNotificationPreference(userId) {
    try {
      if (!userId) return null;
      const prefs = await api.notifications.getPreferences();
      return this.toLegacyPreferences(prefs || {});
    } catch {
      return null;
    }
  }

  static async updateNotificationPreference(userId, prefs) {
    if (!userId) return;
    await api.notifications.updatePreferences(this.fromLegacyPreferences(prefs || {}));
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
    const allowed = await this.requestPermission();
    if (!allowed) return false;
    if (!('serviceWorker' in navigator)) return false;
    const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.REACT_APP_VAPID_PUBLIC_KEY || '';
    if (!vapid) return false;

    try {
      await this.registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapid),
        });
      }
      await api.notifications.subscribePush({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')),
        },
      });
      return true;
    } catch (_e) {
      return false;
    }
  }

  static async subscribeToPushNotifications(userId) {
    return this.subscribe(userId);
  }

  static async createNotificationPreference(userId) {
    if (!userId) return null;
    try {
      const prefs = await api.notifications.getPreferences();
      return this.toLegacyPreferences(prefs || {});
    } catch {
      return null;
    }
  }

  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) return existing;
      return await navigator.serviceWorker.register('/sw-custom.js', { scope: '/' });
    } catch {
      return null;
    }
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
