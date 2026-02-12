/**
 * Service de notifications pour les utilisateurs et vendeurs.
 * Support: in-app, email (optionnel), SMS (Afrique), push (webhook/FCM).
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

/** Envoyer un SMS (stub: log en dev, integrer Twilio ou Africa's Talking en prod) */
async function sendSms(phone: string, message: string): Promise<void> {
  const normalized = phone.replace(/\D/g, '');
  if (!normalized || normalized.length < 8) {
    logger.warn('SMS non envoye: numero invalide', { phone });
    return;
  }

  const smsProvider = process.env.SMS_PROVIDER; // twilio | africas_talking | orange | none
  if (smsProvider === 'none' || !smsProvider) {
    logger.info('SMS (stub)', { phone: phone.slice(-4), message: message.slice(0, 50) });
    return;
  }

  try {
    if (smsProvider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      logger.info('SMS Twilio (configure)', { to: phone.slice(-4), len: message.length });
      return;
    }
    if (smsProvider === 'africas_talking') {
      logger.info('SMS Africa Talking (configure)', { to: phone.slice(-4), len: message.length });
      return;
    }
    logger.info('SMS (stub)', { phone: phone.slice(-4), message: message.slice(0, 50) });
  } catch (err) {
    logger.warn('Erreur envoi SMS', { phone: phone.slice(-4), err });
  }
}

class NotificationService {
  private notificationCategory(type: string): 'order' | 'live' | 'comment' | 'like' | 'follow' {
    const t = String(type || '').toLowerCase();
    if (t.includes('live')) return 'live';
    if (t.includes('comment')) return 'comment';
    if (t.includes('like')) return 'like';
    if (t.includes('follow')) return 'follow';
    return 'order';
  }

  private async logChannelDelivery(
    userId: string,
    type: string,
    message: string,
    status: string,
    emailType?: string,
    subject?: string,
  ) {
    try {
      await prisma.notificationLog.create({
        data: {
          user_id: userId,
          type,
          message,
          status,
          email_type: emailType || null,
          subject: subject || null,
        },
      });
    } catch (err) {
      logger.warn('NotificationLog create failed', { userId, type, err });
    }
  }

  /** Envoyer un SMS a un utilisateur si SMS_ORDER_NOTIFICATIONS=true et qu'il a un numero */
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

  private async sendEmailToUser(userId: string, subject: string, message: string, category: string): Promise<void> {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@afriwonder.app';
    if (!host || !user || !pass) {
      await this.logChannelDelivery(userId, 'notification_email', message, 'skipped', category, subject);
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!target?.email) {
      await this.logChannelDelivery(userId, 'notification_email', message, 'failed', category, subject);
      return;
    }

    try {
      const nodemailer = (await import('nodemailer')).default as any;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: target.email,
        subject,
        text: message,
        html: `<p>${message}</p>`,
      });
      await this.logChannelDelivery(userId, 'notification_email', message, 'sent', category, subject);
    } catch (err) {
      logger.warn('Email notification failed', { userId, err });
      await this.logChannelDelivery(userId, 'notification_email', message, 'failed', category, subject);
    }
  }

  private async sendPushToUser(userId: string, title: string, message: string, category: string, data?: any): Promise<void> {
    const pushWebhook = process.env.PUSH_WEBHOOK_URL;
    const firebaseKey = process.env.FIREBASE_SERVER_KEY;

    if (!pushWebhook && !firebaseKey) {
      await this.logChannelDelivery(userId, 'notification_push', message, 'skipped', category, title);
      return;
    }

    try {
      if (pushWebhook) {
        await axios.post(
          pushWebhook,
          { userId, title, message, category, data: data || {} },
          { timeout: 5000 },
        );
        await this.logChannelDelivery(userId, 'notification_push', message, 'sent', category, title);
        return;
      }

      if (firebaseKey) {
        await axios.post(
          'https://fcm.googleapis.com/fcm/send',
          {
            to: `/topics/user_${userId}`,
            notification: { title, body: message },
            data: { ...(data || {}), category },
          },
          {
            timeout: 5000,
            headers: {
              Authorization: `key=${firebaseKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        await this.logChannelDelivery(userId, 'notification_push', message, 'sent', category, title);
      }
    } catch (err) {
      logger.warn('Push notification failed', { userId, err });
      await this.logChannelDelivery(userId, 'notification_push', message, 'failed', category, title);
    }
  }

  private async dispatchAdditionalChannels(userId: string, payload: { type: string; title: string; message: string; data?: any }) {
    if (process.env.NODE_ENV === 'test') return;

    const category = this.notificationCategory(payload.type);
    const pref = await prisma.notificationPreference.findUnique({
      where: { user_id: userId },
      select: {
        email_order: true,
        email_live: true,
        email_comment: true,
        email_like: true,
        email_follow: true,
        push_order: true,
        push_live: true,
        push_comment: true,
        push_like: true,
        push_follow: true,
      },
    });

    const emailAllowed = !pref
      ? true
      : category === 'live'
        ? !!pref.email_live
        : category === 'comment'
          ? !!pref.email_comment
          : category === 'like'
            ? !!pref.email_like
            : category === 'follow'
              ? !!pref.email_follow
              : !!pref.email_order;

    const pushAllowed = !pref
      ? true
      : category === 'live'
        ? !!pref.push_live
        : category === 'comment'
          ? !!pref.push_comment
          : category === 'like'
            ? !!pref.push_like
            : category === 'follow'
              ? !!pref.push_follow
              : !!pref.push_order;

    if (emailAllowed) {
      await this.sendEmailToUser(userId, payload.title, payload.message, category);
    } else {
      await this.logChannelDelivery(userId, 'notification_email', payload.message, 'disabled', category, payload.title);
    }

    if (pushAllowed) {
      await this.sendPushToUser(userId, payload.title, payload.message, category, payload.data);
    } else {
      await this.logChannelDelivery(userId, 'notification_push', payload.message, 'disabled', category, payload.title);
    }
  }

  /**
   * Creer une notification pour un utilisateur.
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

    logger.info('Notification creee', { notificationId: notification.id, userId, type: data.type });
    this.dispatchAdditionalChannels(userId, {
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
    }).catch((err) => {
      logger.warn('dispatchAdditionalChannels failed', { userId, type: data.type, err });
    });
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
      title: 'Nouvelle commande recue',
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
      processing: 'Votre commande est en cours de preparation',
      shipped: 'Votre commande a ete expediee',
      in_transit: 'Votre commande a ete expediee',
      delivered: 'Votre commande a ete livree',
      cancelled: 'Votre commande a ete annulee',
      refunded: 'Votre commande a ete remboursee',
      paid: 'Paiement recu pour votre commande',
      completed: 'Votre commande est terminee',
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

  async notifyShipmentUpdate(userId: string, orderId: string, status: string, recipientRole: 'buyer' | 'seller') {
    const frMap: Record<string, string> = {
      pending: 'Expedition en attente',
      in_transit: 'Expedition en cours',
      out_for_delivery: 'Colis en cours de livraison',
      delivered: 'Colis livre',
      failed: 'Livraison echouee',
    };
    const msgBase = frMap[status] || `Statut expedition: ${status}`;
    const msg = recipientRole === 'seller'
      ? `Commande #${orderId.slice(0, 8)} - ${msgBase}`
      : `Votre commande #${orderId.slice(0, 8)} - ${msgBase}`;

    await this.sendSmsToUser(userId, msg);
    return this.create(userId, {
      type: 'shipment_update',
      title: 'Mise a jour livraison',
      message: msg,
      reference_type: 'order',
      reference_id: orderId,
      data: { orderId, status, recipientRole },
    });
  }

  async notifyReturnUpdate(
    userId: string,
    returnId: string,
    orderId: string,
    status: string,
    recipientRole: 'buyer' | 'seller',
  ) {
    const msg = recipientRole === 'buyer'
      ? `Retour/echange #${returnId.slice(0, 8)}: statut ${status}`
      : `Demande retour/echange sur commande #${orderId.slice(0, 8)}: ${status}`;

    await this.sendSmsToUser(userId, msg);
    return this.create(userId, {
      type: 'return_update',
      title: 'Mise a jour retour/echange',
      message: msg,
      reference_type: 'return',
      reference_id: returnId,
      data: { returnId, orderId, status, recipientRole },
    });
  }

  /**
   * Notifier un vendeur d'un nouveau paiement recu.
   */
  async notifyPaymentReceived(sellerId: string, orderId: string, amount: number) {
    return this.create(sellerId, {
      type: 'payment_received',
      title: 'Paiement recu',
      message: `Paiement de ${amount.toLocaleString()} FCFA recu pour la commande #${orderId}`,
      reference_type: 'order',
      reference_id: orderId,
      data: { orderId, amount },
    });
  }

  /**
   * Notifier un vendeur d'un nouvel avis.
   */
  async notifyNewReview(sellerId: string, reviewId: string, rating: number, reviewerName?: string) {
    return this.create(sellerId, {
      type: 'review_new',
      title: 'Nouvel avis recu',
      message: reviewerName
        ? `${reviewerName} a laisse un avis ${rating}/5`
        : `Nouvel avis ${rating}/5 recu`,
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
      ? `Litige ouvert pour la commande #${orderId.slice(0, 8)}. Connectez-vous pour repondre.`
      : `Votre litige pour la commande #${orderId.slice(0, 8)} a ete enregistre.`;
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
   * Notifier la resolution d'un litige (acheteur + vendeur).
   */
  async notifyDisputeResolved(userId: string, disputeId: string, orderId: string, resolution: string, isSeller: boolean) {
    const msg = `Litige resolu pour la commande #${orderId.slice(0, 8)} : ${resolution}`;
    await this.sendSmsToUser(userId, msg);
    return this.create(userId, {
      type: 'dispute_resolved',
      title: 'Litige resolu',
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
      userIds.map((userId) => this.create(userId, data))
    );
    logger.info('Notifications bulk creees', { count: notifications.length, type: data.type });
    return notifications;
  }
}

export default new NotificationService();
