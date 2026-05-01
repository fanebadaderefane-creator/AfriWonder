/**
 * Service de notifications pour les utilisateurs et vendeurs.
 * Support: in-app, email (optionnel), SMS (Afrique), push (webhook/FCM).
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendViaResend } from '../utils/transactionalEmail.js';
import axios from 'axios';

/**
 * Émet un événement Socket.io vers la room `user:${userId}`.
 * Import dynamique pour casser le cycle `message.service` ↔ `notification.service`.
 * Fire-and-forget : toute erreur est journalisée sans propagation.
 */
async function emitToUserRoomSafe(userId: string, event: string, payload: unknown): Promise<void> {
  try {
    const mod = await import('./message.service.js');
    if (typeof mod.emitToUserRoom === 'function') {
      mod.emitToUserRoom(userId, event, payload);
    }
  } catch (err) {
    logger.warn('emitToUserRoomSafe failed', {
      userId,
      event,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

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

/** Token stocké comme `fcm:<platform>:<token>` (voir `mobile.routes`). */
function parseMobilePushEndpoint(endpoint: string): { platform: string; token: string } | null {
  const s = String(endpoint || '');
  if (!s.startsWith('fcm:')) return null;
  const rest = s.slice(4);
  const i = rest.indexOf(':');
  if (i < 0) return null;
  return { platform: rest.slice(0, i), token: rest.slice(i + 1) };
}

/** Expo attend des valeurs string dans `data`. */
function expoStringData(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[String(k)] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}

class NotificationService {
  private warnedMissingPushConfig = false;

  private notificationCategory(type: string): 'order' | 'live' | 'comment' | 'like' | 'follow' {
    const t = String(type || '').toLowerCase();
    if (t.includes('live')) return 'live';
    if (t.includes('call')) return 'live';
    if (t.includes('wonder')) return 'follow';
    if (t.includes('mention')) return 'comment';
    if (t.includes('message')) return 'comment';
    if (t.includes('comment')) return 'comment';
    if (t.includes('tip')) return 'like';
    if (t.includes('like')) return 'like';
    if (t.includes('follow')) return 'follow';
    return 'order';
  }

  /** Origine publique PWA (liens dans les push + action_url). */
  private getPublicOrigin(): string {
    const raw =
      process.env.APP_PUBLIC_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      process.env.CLIENT_APP_URL?.trim() ||
      '';
    if (raw) return raw.replace(/\/+$/, '');
    const cors = process.env.CORS_ORIGIN?.trim();
    if (cors) {
      const first = cors.split(',')[0]?.trim();
      if (first) return first.replace(/\/+$/, '');
    }
    return 'https://afriwonder.com';
  }

  /**
   * URL absolue pour router l'utilisateur au bon écran (tap sur la notification système).
   */
  public buildPushDeepLink(
    type: string,
    reference_type?: string | null,
    reference_id?: string | null,
    data?: Record<string, unknown> | null,
  ): string {
    const origin = this.getPublicOrigin();
    const toAbs = (pathnameAndQuery: string) =>
      `${origin}${pathnameAndQuery.startsWith('/') ? pathnameAndQuery : `/${pathnameAndQuery}`}`;

    const t = String(type || '').toLowerCase();
    const rt = String(reference_type || '').toLowerCase();
    const rid = reference_id ? String(reference_id) : '';
    const d = data && typeof data === 'object' ? data : {};

    const groupId =
      (typeof d.groupId === 'string' && d.groupId) ||
      (/group/.test(rt) ? rid : '') ||
      '';

    if (groupId && (rt.includes('group') || t.includes('group'))) {
      return toAbs(`/GroupChat?groupId=${encodeURIComponent(groupId)}`);
    }

    const conversationId =
      (typeof d.conversationId === 'string' && d.conversationId) ||
      (rt === 'conversation' ? rid : '') ||
      '';

    if (t.includes('message') && conversationId) {
      return toAbs(`/Chat?conversationId=${encodeURIComponent(conversationId)}`);
    }

    const videoId =
      (typeof d.videoId === 'string' && d.videoId) ||
      (rt === 'video' ? rid : '') ||
      '';

    if (
      videoId &&
      (t.includes('comment') ||
        t.includes('like') ||
        t.includes('tip') ||
        t.includes('mention') ||
        rt === 'video')
    ) {
      return toAbs(`/VideoView?id=${encodeURIComponent(videoId)}`);
    }

    if (
      (t.includes('follow') || t.includes('follower') || t.includes('wonder')) &&
      rid &&
      (rt === 'user' || rt === 'follow_request')
    ) {
      return toAbs(`/Profile?userId=${encodeURIComponent(rid)}`);
    }

    /** Appels payés Stars — éviter la branche générique `call` (DirectCall PWA) qui ferait matcher `star_call_*`. */
    if (rt === 'star_booking' && rid) {
      if (t === 'star_call_reminder_10min' || t === 'star_call_ready') {
        return toAbs(`/stars/call/${encodeURIComponent(rid)}`);
      }
      return toAbs('/stars/bookings');
    }

    if (t.includes('call') && rid) {
      const caller = typeof d.callerId === 'string' && d.callerId ? d.callerId : '';
      const rawMedia =
        typeof d.callMediaType === 'string'
          ? d.callMediaType
          : typeof d.type === 'string' && d.type !== 'call_incoming' && d.type !== 'call_missed'
            ? d.type
            : '';
      const callType = rawMedia === 'video' || rawMedia === 'audio' ? rawMedia : '';
      const q = new URLSearchParams({ mode: 'incoming', callId: rid });
      if (caller) q.set('callerId', caller);
      if (callType) q.set('type', callType);
      return toAbs(`/DirectCall?${q.toString()}`);
    }

    if (t.includes('live') && rid) {
      return toAbs(`/LiveView?channel=${encodeURIComponent(rid)}`);
    }

    if (
      (t.includes('order') ||
        rt === 'order' ||
        t.includes('shipment') ||
        t.includes('return') ||
        t.includes('payment') ||
        t.includes('dispute')) &&
      rid
    ) {
      return toAbs('/Orders');
    }

    return toAbs('/Notifications');
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
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!target?.email) {
      await this.logChannelDelivery(userId, 'notification_email', message, 'failed', category, subject);
      return;
    }

    if (process.env.RESEND_API_KEY?.trim()) {
      const ok = await sendViaResend({
        to: target.email,
        subject,
        text: message,
        html: `<p>${message}</p>`,
      });
      await this.logChannelDelivery(
        userId,
        'notification_email',
        message,
        ok ? 'sent' : 'failed',
        category,
        subject,
      );
      return;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@afriwonder.app';
    if (!host || !user || !pass) {
      await this.logChannelDelivery(userId, 'notification_email', message, 'skipped', category, subject);
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

  /**
   * Expo Push API — tokens `ExponentPushToken[...]` (client Expo / EAS).
   * `EXPO_ACCESS_TOKEN` (expo.dev) optionnel pour débit / contrôle.
   */
  private async sendExpoPushBatch(
    items: {
      to: string;
      title: string;
      body: string;
      data: Record<string, string>;
      channelId?: string;
    }[],
  ): Promise<boolean> {
    if (items.length === 0) return false;
    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const messages = items.map((m) => ({
      to: m.to,
      title: m.title,
      body: m.body,
      sound: 'default',
      priority: 'high',
      channelId: m.channelId || 'default',
      data: m.data,
    }));
    try {
      const res = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        { messages },
        { timeout: 20000, headers, validateStatus: () => true },
      );
      if (res.status >= 400) {
        logger.warn('Expo push HTTP error', { status: res.status, body: res.data });
        return false;
      }
      const tickets = res.data?.data;
      if (!Array.isArray(tickets)) {
        logger.warn('Expo push réponse inattendue', { body: res.data });
        return false;
      }
      const ok = tickets.some((t: { status?: string }) => t?.status === 'ok');
      const errors = tickets.filter((t: { status?: string }) => t?.status === 'error');
      if (errors.length) {
        logger.warn('Expo push tickets en erreur', { count: errors.length, sample: errors[0] });
      }
      return ok;
    } catch (err) {
      logger.warn('Expo push échec réseau', { err });
      return false;
    }
  }

  private async sendPushToUser(userId: string, title: string, message: string, category: string, data?: any): Promise<void> {
    const pushWebhook = process.env.PUSH_WEBHOOK_URL;
    const firebaseKey = process.env.FIREBASE_SERVER_KEY;
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@afriwonder.app';

    const dataObj: Record<string, unknown> = { ...(data || {}), category };
    const payload = JSON.stringify({
      title,
      body: message,
      tag: category,
      data: dataObj,
      actions: Array.isArray(dataObj.actions) ? dataObj.actions : [],
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });

    let delivered = false;

    const activeSubscriptions = await prisma.pushSubscription.findMany({
      where: { user_id: userId, is_active: true },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    const webPushSubscriptions = activeSubscriptions.filter((s) => !String(s.endpoint).startsWith('fcm:'));
    const mobilePushSubscriptions = activeSubscriptions.filter((s) => String(s.endpoint).startsWith('fcm:'));

    if (vapidPublic && vapidPrivate) {
      try {
        const webpush = (await import('web-push')).default as any;
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
        if (webPushSubscriptions.length > 0) {
          const results = await Promise.allSettled(
            webPushSubscriptions.map((s) =>
              webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                payload
              )
            )
          );
          for (let i = 0; i < results.length; i += 1) {
            const r = results[i];
            if (r.status === 'fulfilled') {
              delivered = true;
              continue;
            }
            const statusCode = (r as any).reason?.statusCode;
            if (statusCode === 404 || statusCode === 410) {
              await prisma.pushSubscription.update({
                where: { id: webPushSubscriptions[i].id },
                data: { is_active: false, last_seen: new Date() },
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        logger.warn('WebPush send failed', { userId, err });
      }
    }

    const expoData = expoStringData(dataObj);
    const incomingCallExpo =
      String(dataObj.type || '') === 'call_incoming';
    const expoMessages: {
      to: string;
      title: string;
      body: string;
      data: Record<string, string>;
      channelId?: string;
    }[] = [];
    const legacyRegistrationIds: string[] = [];
    for (const sub of mobilePushSubscriptions) {
      const parsed = parseMobilePushEndpoint(sub.endpoint);
      if (!parsed?.token) continue;
      if (parsed.token.startsWith('ExponentPushToken')) {
        expoMessages.push({
          to: parsed.token,
          title,
          body: message,
          data: expoData,
          channelId: incomingCallExpo ? 'calls' : undefined,
        });
      } else {
        legacyRegistrationIds.push(parsed.token);
      }
    }

    if (expoMessages.length > 0) {
      const ok = await this.sendExpoPushBatch(expoMessages);
      if (ok) delivered = true;
    }

    const needsLegacyFcm = legacyRegistrationIds.length > 0;

    if (!delivered && !pushWebhook && !firebaseKey && expoMessages.length === 0 && !needsLegacyFcm) {
      if (!this.warnedMissingPushConfig) {
        this.warnedMissingPushConfig = true;
        logger.warn(
          'Push désactivé : définir VAPID (web), ou tokens Expo (aucun ExponentPushToken en base), ' +
            'ou EXPO_ACCESS_TOKEN + enregistrement mobile, ou PUSH_WEBHOOK_URL, ou FIREBASE_SERVER_KEY (FCM legacy device tokens).',
        );
      }
      await this.logChannelDelivery(userId, 'notification_push', message, 'skipped', category, title);
      return;
    }

    if (!delivered && needsLegacyFcm && !firebaseKey) {
      if (!this.warnedMissingPushConfig) {
        this.warnedMissingPushConfig = true;
        logger.warn(
          'Push mobile : tokens natifs FCM sans FIREBASE_SERVER_KEY — ajoutez la clé serveur ou migrez vers Expo Push.',
        );
      }
      await this.logChannelDelivery(userId, 'notification_push', message, 'skipped', category, title);
      return;
    }

    try {
      if (delivered) {
        await this.logChannelDelivery(userId, 'notification_push', message, 'sent', category, title);
        return;
      }

      if (pushWebhook) {
        await axios.post(
          pushWebhook,
          { userId, title, message, category, data: data || {} },
          { timeout: 5000 },
        );
        await this.logChannelDelivery(userId, 'notification_push', message, 'sent', category, title);
        return;
      }

      if (firebaseKey && legacyRegistrationIds.length > 0) {
        await axios.post(
          'https://fcm.googleapis.com/fcm/send',
          {
            registration_ids: legacyRegistrationIds,
            notification: { title, body: message },
            data: Object.fromEntries(
              Object.entries({ ...(data || {}), category }).map(([k, v]) => [
                k,
                v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v),
              ]),
            ),
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
        return;
      }

      if (firebaseKey && !needsLegacyFcm && mobilePushSubscriptions.length === 0) {
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
        return;
      }

      if (!delivered && expoMessages.length > 0) {
        await this.logChannelDelivery(userId, 'notification_push', message, 'failed', category, title);
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
    const payloadData: Record<string, unknown> = {
      ...(data.data && typeof data.data === 'object' ? data.data : {}),
    };
    payloadData.type = data.type;
    if (data.reference_type != null && String(data.reference_type).trim() !== '') {
      payloadData.reference_type = data.reference_type;
    }
    if (data.reference_id != null && String(data.reference_id).trim() !== '') {
      payloadData.reference_id = data.reference_id;
    }
    const actionUrl = this.buildPushDeepLink(
      data.type,
      data.reference_type,
      data.reference_id,
      payloadData,
    );
    if (payloadData.url == null || payloadData.url === '') {
      payloadData.url = actionUrl;
    }

    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        reference_type: data.reference_type,
        reference_id: data.reference_id,
        is_read: false,
        action_url: actionUrl,
      },
    });

    logger.info('Notification creee', { notificationId: notification.id, userId, type: data.type });

    // Temps réel : informer l'app mobile/PWA via Socket.io. L'écran `notifications`
    // (Expo: `app/notifications/index.tsx`) écoute `new_notification` et `notification`.
    // On émet les DEUX noms pour compatibilité ascendante avec les clients déjà déployés.
    const realtimePayload = {
      id: notification.id,
      type: data.type,
      title: data.title,
      message: data.message,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      action_url: actionUrl,
      data: payloadData,
      created_at: notification.created_at,
      is_read: false,
    };
    emitToUserRoomSafe(userId, 'new_notification', realtimePayload);
    emitToUserRoomSafe(userId, 'notification', realtimePayload);

    this.dispatchAdditionalChannels(userId, {
      type: data.type,
      title: data.title,
      message: data.message,
      data: payloadData,
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
