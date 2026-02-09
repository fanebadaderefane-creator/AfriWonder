/**
 * Service de notifications pour les utilisateurs et vendeurs.
 * Support : in-app, email (optionnel), SMS (Afrique — Twilio / Africa's Talking).
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/** Envoyer un SMS (stub : log en dev, intégrer Twilio ou Africa's Talking en prod) */
async function sendSms(phone: string, message: string): Promise<void> {
  const normalized = phone.replace(/\D/g, '');
  if (!normalized || normalized.length < 8) {
    logger.warn('SMS non envoyé : numéro invalide', { phone });
    return;
  }
  // Intégration possible : Twilio, Africa's Talking, Orange SMS API, etc.
  const smsProvider = process.env.SMS_PROVIDER; // twilio | africas_talking | orange | none
  if (smsProvider === 'none' || !smsProvider) {
    logger.info('SMS (stub)', { phone: phone.slice(-4), message: message.slice(0, 50) });
    return;
  }
  try {
    if (smsProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await twilio.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
      logger.info('SMS Twilio (configuré)', { to: phone.slice(-4), len: message.length });
      return;
    }
    if (smsProvider === 'africas_talking') {
      // Africa's Talking SDK
      logger.info('SMS Africa\'s Talking (configuré)', { to: phone.slice(-4), len: message.length });
      return;
    }
    logger.info('SMS (stub)', { phone: phone.slice(-4), message: message.slice(0, 50) });
  } catch (err) {
    logger.warn('Erreur envoi SMS', { phone: phone.slice(-4), err });
  }
}

class NotificationService {
  /** Envoyer un SMS à un utilisateur si SMS_ORDER_NOTIFICATIONS=true et qu'il a un numéro (Afrique). */
  private async sendSmsToUser(userId: string, message: string): Promise<void> {
    if (process.env.SMS_ORDER_NOTIFICATIONS !== 'true') return;
    try {
      const addr = await prisma.address.findFirst({
        where: { user_id: userId, is_default: true },
        select: { phone: true },
      });
      const phone = addr?.phone;
      if (phone) await sendSms(phone, message);
    } catch (err) {
      logger.warn('SMS order notification skip', { userId, err });
    }
  }

  /**
   * Créer une notification pour un utilisateur.
   */
  async create(userId: string, data: {
    type: string;
    title: string;
    message: string;
    reference_type?: string;
    reference_id?: string;
    data?: any;
  }) {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        is_read: false,
      },
    });

    logger.info('Notification créée', { notificationId: notification.id, userId, type: data.type });
    return notification;
  }

  /**
   * Notifier un vendeur d'une nouvelle commande.
   */
  async notifyNewOrder(sellerId: string, orderId: string, orderAmount: number, buyerName?: string) {
    const msg = buyerName
      ? `Nouvelle commande #${orderId.slice(0, 8)} de ${buyerName} pour ${orderAmount.toLocaleString()} FCFA`
      : `Nouvelle commande #${orderId.slice(0, 8)} pour ${orderAmount.toLocaleString()} FCFA`;
    await this.sendSmsToUser(sellerId, msg);
    return this.create(sellerId, {
      type: 'order_new',
      title: 'Nouvelle commande reçue',
      message: msg,
      reference_type: 'order',
      reference_id: orderId,
      data: { orderId, amount: orderAmount, buyerName },
    });
  }

  /**
   * Notifier un acheteur d'un changement de statut de commande.
   */
  async notifyOrderStatusUpdate(buyerId: string, orderId: string, status: string, sellerName?: string) {
    const statusMessages: Record<string, string> = {
      processing: 'Votre commande est en cours de préparation',
      shipped: 'Votre commande a été expédiée',
      in_transit: 'Votre commande a été expédiée',
      delivered: 'Votre commande a été livrée',
      cancelled: 'Votre commande a été annulée',
      refunded: 'Votre commande a été remboursée',
      paid: 'Paiement reçu pour votre commande',
      completed: 'Votre commande est terminée',
    };
    const msg = statusMessages[status] || `Commande #${orderId.slice(0, 8)} : ${status}`;
    await this.sendSmsToUser(buyerId, msg);
    return this.create(buyerId, {
      type: 'order_status',
      title: `Commande ${status}`,
      message: msg,
      reference_type: 'order',
      reference_id: orderId,
      data: { orderId, status, sellerName },
    });
  }

  /**
   * Notifier un vendeur d'un nouveau paiement reçu.
   */
  async notifyPaymentReceived(sellerId: string, orderId: string, amount: number) {
    return this.create(sellerId, {
      type: 'payment_received',
      title: 'Paiement reçu',
      message: `Paiement de ${amount.toLocaleString()} FCFA reçu pour la commande #${orderId}`,
      reference_type: 'order',
      reference_id: orderId,
      data: { orderId, amount },
    });
  }

  /**
   * Notifier un vendeur d'un nouveau review/avis.
   */
  async notifyNewReview(sellerId: string, reviewId: string, rating: number, reviewerName?: string) {
    return this.create(sellerId, {
      type: 'review_new',
      title: 'Nouvel avis reçu',
      message: reviewerName
        ? `${reviewerName} a laissé un avis ${rating}/5`
        : `Nouvel avis ${rating}/5 reçu`,
      reference_type: 'review',
      reference_id: reviewId,
      data: { reviewId, rating, reviewerName },
    });
  }

  /**
   * Notifier un utilisateur d'un litige ouvert.
   */
  async notifyDisputeOpened(userId: string, disputeId: string, orderId: string, isSeller: boolean) {
    const msg = isSeller
      ? `Litige ouvert pour la commande #${orderId.slice(0, 8)}. Connectez-vous pour répondre.`
      : `Votre litige pour la commande #${orderId.slice(0, 8)} a été enregistré.`;
    await this.sendSmsToUser(userId, msg);
    return this.create(userId, {
      type: 'dispute_opened',
      title: isSeller ? 'Litige ouvert sur votre commande' : 'Litige ouvert',
      message: msg,
      reference_type: 'dispute',
      reference_id: disputeId,
      data: { disputeId, orderId, isSeller },
    });
  }

  /**
   * Notifier la résolution d'un litige (acheteur + vendeur).
   */
  async notifyDisputeResolved(userId: string, disputeId: string, orderId: string, resolution: string, isSeller: boolean) {
    const msg = `Litige résolu pour la commande #${orderId.slice(0, 8)} : ${resolution}`;
    await this.sendSmsToUser(userId, msg);
    return this.create(userId, {
      type: 'dispute_resolved',
      title: 'Litige résolu',
      message: msg,
      reference_type: 'dispute',
      reference_id: disputeId,
      data: { disputeId, orderId, resolution, isSeller },
    });
  }

  /**
   * Notifier plusieurs utilisateurs en bulk.
   */
  async createBulk(userIds: string[], data: {
    type: string;
    title: string;
    message: string;
    reference_type?: string;
    reference_id?: string;
    data?: any;
  }) {
    const notifications = await Promise.all(
      userIds.map(userId => this.create(userId, data))
    );
    logger.info('Notifications bulk créées', { count: notifications.length, type: data.type });
    return notifications;
  }
}

export default new NotificationService();
