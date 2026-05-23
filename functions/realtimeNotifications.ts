import { base44 } from "@base44/sdk";

// Send real-time notification
export async function sendRealtimeNotification(request) {
  const { userId, type, title, message, referenceType, referenceId, data } = request.body;

  try {
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      type,
      title,
      message,
      reference_type: referenceType,
      reference_id: referenceId,
      is_read: false,
      data: data || {},
      created_at: new Date().toISOString()
    });

    // Envoyer via WebSocket (simulé avec subscription)
    await base44.entities.Notification.subscribe((event) => {
      if (event.id === notification.id) {
        // Notification créée et prête
      }
    });

    return { success: true, notificationId: notification.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send email notification
export async function sendEmailNotification(request) {
  const { userId, subject, body, emailType } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const user = users[0];

    // Vérifier les préférences de notification
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_id: userId
    });

    const enabled = !prefs || prefs.length === 0 || prefs[0][emailType] !== false;
    if (!enabled) {
      return { success: true, message: "Notification désactivée par l'utilisateur" };
    }

    // Envoyer l'email
    await base44.integrations.Core.SendEmail({
      to: user.email,
      subject,
      body
    });

    // Créer un log
    await base44.asServiceRole.entities.NotificationLog.create({
      user_id: userId,
      type: "email",
      email_type: emailType,
      subject,
      status: "sent",
      sent_at: new Date().toISOString()
    });

    return { success: true, message: "Email envoyé" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send SMS notification
export async function sendSMSNotification(request) {
  const { userId, message, smsType } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    const user = users[0];

    // Vérifier les préférences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_id: userId
    });

    const enabled = !prefs || prefs.length === 0 || prefs[0][smsType] !== false;
    if (!enabled) {
      return { success: true, message: "SMS désactivé par l'utilisateur" };
    }

    // Simuler l'envoi SMS (en prod, utiliser Twilio, AWS SNS, etc.)
    const smsLog = await base44.asServiceRole.entities.NotificationLog.create({
      user_id: userId,
      type: "sms",
      sms_type: smsType,
      message,
      phone: user.phone || "****",
      status: "sent",
      sent_at: new Date().toISOString()
    });

    return {
      success: true,
      logId: smsLog.id,
      message: "SMS envoyé"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send push notification
export async function sendPushNotification(request) {
  const { userId, title, body, icon, action } = request.body;

  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    // Créer le log
    const pushLog = await base44.asServiceRole.entities.NotificationLog.create({
      user_id: userId,
      type: "push",
      title,
      body,
      status: "sent",
      sent_at: new Date().toISOString()
    });

    // Envoyer via service worker (simulé)
    return {
      success: true,
      logId: pushLog.id,
      message: "Push notification envoyée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user notifications
export async function getUserNotifications(request) {
  const { userId, limit = 20 } = request.query;

  try {
    let notifications = await base44.asServiceRole.entities.Notification.filter({
      user_id: userId
    });

    notifications = notifications.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, limit);

    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Mark notification as read
export async function markNotificationAsRead(request) {
  const { notificationId } = request.body;

  try {
    await base44.asServiceRole.entities.Notification.update(notificationId, {
      is_read: true,
      read_at: new Date().toISOString()
    });

    return { success: true, message: "Marqué comme lu" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(request) {
  const { userId } = request.body;

  try {
    const notifications = await base44.asServiceRole.entities.Notification.filter({
      user_id: userId,
      is_read: false
    });

    for (const notif of notifications || []) {
      await base44.asServiceRole.entities.Notification.update(notif.id, {
        is_read: true,
        read_at: new Date().toISOString()
      });
    }

    return { success: true, count: notifications?.length || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get unread count
export async function getUnreadCount(request) {
  const { userId } = request.query;

  try {
    const notifications = await base44.asServiceRole.entities.Notification.filter({
      user_id: userId,
      is_read: false
    });

    return { success: true, count: notifications?.length || 0 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}