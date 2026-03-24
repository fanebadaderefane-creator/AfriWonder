import { api } from '@/api/expressClient';

/**
 * Service de notifications push pour AfriWonder
 */
export class PushNotificationService {
  static instance = null;
  static serviceWorkerSupported = 'serviceWorker' in navigator;

  static getInstance() {
    if (!this.instance) {
      this.instance = new PushNotificationService();
    }
    return this.instance;
  }

  async initialize() {
    if (!this.serviceWorkerSupported) {
      console.log('Service Workers non supporté');
      return;
    }

    try {
      // Réutiliser le service worker principal de l'app pour éviter les conflits de scope en PWA/WebView.
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw-custom.js', { scope: '/' });
      }
      console.log('Service Worker enregistré');

      // Demander la permission
      if (Notification.permission === 'granted') {
        this.subscribeUser(registration);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            this.subscribeUser(registration);
          }
        });
      }
    } catch (error) {
      console.error('Erreur Service Worker:', error);
    }
  }

  async subscribeUser(registration) {
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || import.meta.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      // Envoyer la subscription au serveur
      const user = await api.auth.me();
      await api.entities.NotificationPreference.create({
        user_id: user.id,
        subscription_endpoint: subscription.endpoint,
        auth_key: subscription.getKey('auth'),
        p256dh_key: subscription.getKey('p256dh')
      });

      console.log('Utilisateur abonné aux notifications');
    } catch (error) {
      console.error('Erreur subscription:', error);
    }
  }

  async sendNotification(userId, title, options = {}) {
    try {
      const user = await api.auth.me();
      
      // TODO: Create notification in database

      // Si le user est le user actuel, afficher une notification
      if (user.id === userId && this.serviceWorkerSupported) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body: options.message,
          icon: '/AfriWonder%20logo.png',
          badge: '/logo-badge.png',
          tag: options.type,
          data: options.data,
          requireInteraction: options.requireInteraction || false
        });
      }
    } catch (error) {
      console.error('Erreur envoi notification:', error);
    }
  }

  async sendBulkNotification(userIds, title, options = {}) {
    await Promise.all(userIds.map(userId => this.sendNotification(userId, title, options)));
  }

  async sendTransactionNotification(userId, transaction) {
    const typeTexts = {
      'payment': 'Paiement effectué',
      'refund': 'Remboursement reçu',
      'payout': 'Retrait approuvé',
      'tip_sent': 'Pourboire envoyé',
      'tip_received': 'Pourboire reçu',
      'gift_sent': 'Cadeau envoyé',
      'gift_received': 'Cadeau reçu'
    };

    await this.sendNotification(userId, typeTexts[transaction.type] || 'Transaction', {
      message: `${transaction.amount.toLocaleString()} XOF - ${transaction._description}`,
      type: 'transaction',
      data: { transaction_id: transaction.id }
    });
  }

  async sendOrderNotification(userId, order, status) {
    const statusTexts = {
      'confirmed': 'Commande confirmée',
      'shipped': 'Commande expédiée',
      'delivered': 'Commande livrée',
      'cancelled': 'Commande annulée'
    };

    await this.sendNotification(userId, statusTexts[status] || 'Mise à jour commande', {
      message: `Commande #${order.id}`,
      type: 'order',
      data: { order_id: order.id }
    });
  }

  async sendLiveNotification(creatorId, viewers = 5) {
    await this.sendNotification(creatorId, 'Votre live est en direct', {
      message: `${viewers} spectateurs vous regardent`,
      type: 'live',
      requireInteraction: true
    });
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export default PushNotificationService;



