import { base44 } from "@base44/sdk";

// Auto-filter content
export async function autoFilterContent(request) {
  const { content, contentType } = request.body;

  try {
    const bannedWords = [
      "spam", "hate", "violence", "exploit",
      "nsfw", "copyright", "fraud"
    ];

    const lowerContent = content.toLowerCase();
    const flagged = bannedWords.some(word => lowerContent.includes(word));

    return {
      success: true,
      isFlagged: flagged,
      reason: flagged ? "Contenu potentiellement interdit" : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Report content
export async function reportContent(request) {
  const { contentType, contentId, reason, description, reporterId, evidence } = request.body;

  try {
    const report = await base44.asServiceRole.entities.Moderation.create({
      content_type: contentType,
      content_id: contentId,
      reason,
      description,
      reporter_id: reporterId,
      evidence: evidence || [],
      status: "pending",
      severity: calculateSeverity(reason),
      created_at: new Date().toISOString()
    });

    // Notifier les modérateurs
    const moderators = await base44.asServiceRole.entities.User.filter({
      role: "moderator"
    });

    for (const mod of moderators || []) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: mod.id,
        type: "report",
        title: "Nouveau signalement",
        message: `Contenu signalé: ${contentType}`,
        reference_type: "report",
        reference_id: report.id,
        is_read: false
      });
    }

    return {
      success: true,
      reportId: report.id,
      message: "Merci pour votre signalement"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Review moderation report
export async function reviewModerationReport(request) {
  const { reportId, action, moderatorId, notes } = request.body;

  try {
    const reports = await base44.asServiceRole.entities.Moderation.filter({
      id: reportId
    });

    if (!reports || reports.length === 0) {
      return { success: false, error: "Rapport non trouvé" };
    }

    const report = reports[0];
    const validActions = ["approve", "reject", "delete_content", "warn_user", "ban_user"];

    if (!validActions.includes(action)) {
      return { success: false, error: "Action invalide" };
    }

    await base44.asServiceRole.entities.Moderation.update(reportId, {
      status: "resolved",
      action_taken: action,
      moderator_id: moderatorId,
      moderator_notes: notes,
      resolved_at: new Date().toISOString()
    });

    // Exécuter l'action
    if (action === "delete_content") {
      await deleteContent(report.content_type, report.content_id);
    } else if (action === "warn_user") {
      await warnUser(report.reported_user_id);
    } else if (action === "ban_user") {
      await banUser(report.reported_user_id, report.reason, reportId);
    }

    return {
      success: true,
      message: `Rapport résolu: ${action}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Ban user
export async function banUser(request) {
  const { userId, reason, duration = 0, description } = request.body;

  try {
    const ban = await base44.asServiceRole.entities.UserBan.create({
      user_id: userId,
      ban_type: duration === 0 ? "permanent_ban" : "temporary_suspension",
      reason,
      description,
      duration_days: duration,
      expiry_date: duration > 0 
        ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString()
        : null,
      is_active: true,
      issued_by: "system",
      issued_date: new Date().toISOString()
    });

    // Notifier l'utilisateur
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (users && users.length > 0) {
      await base44.integrations.Core.SendEmail({
        to: users[0].email,
        subject: "Votre compte a été suspendu",
        body: `Raison: ${reason}\n\nPour contester, répondez à cet email.`
      });
    }

    return {
      success: true,
      banId: ban.id,
      message: `Utilisateur banni: ${duration > 0 ? `${duration} jours` : "Permanent"}`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Warn user
export async function warnUser(userId) {
  try {
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    if (!users || users.length === 0) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    await base44.integrations.Core.SendEmail({
      to: users[0].email,
      subject: "Avertissement: violation des conditions",
      body: "Votre compte a violé les conditions d'utilisation. Respect requis ou votre compte sera suspendu."
    });

    return { success: true, message: "Avertissement envoyé" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Delete content
async function deleteContent(contentType, contentId) {
  try {
    const entity = {
      video: "Video",
      comment: "Comment",
      post: "Post",
      product: "Product"
    }[contentType];

    if (entity) {
      await base44.asServiceRole.entities[entity].update(contentId, {
        is_deleted: true
      });
    }
  } catch (error) {
    console.error("Error deleting content:", error);
  }
}

// Get moderation dashboard stats
export async function getModerationStats(request) {
  try {
    const pendingReports = await base44.asServiceRole.entities.Moderation.filter({
      status: "pending"
    });

    const activeBans = await base44.asServiceRole.entities.UserBan.filter({
      is_active: true
    });

    const recentActions = await base44.asServiceRole.entities.Moderation.filter({
      status: "resolved"
    });

    return {
      success: true,
      stats: {
        pendingReports: pendingReports?.length || 0,
        activeBans: activeBans?.length || 0,
        resolvedToday: recentActions?.filter(r => 
          new Date(r.resolved_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Unban user
export async function unbanUser(request) {
  const { banId } = request.body;

  try {
    const bans = await base44.asServiceRole.entities.UserBan.filter({ id: banId });
    if (!bans || bans.length === 0) {
      return { success: false, error: "Ban non trouvé" };
    }

    await base44.asServiceRole.entities.UserBan.update(banId, {
      is_active: false
    });

    return { success: true, message: "Utilisateur débanni" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Calculate severity
function calculateSeverity(reason) {
  const severityMap = {
    hate_speech: "critical",
    explicit_content: "high",
    harassment: "high",
    spam: "medium",
    copyright: "medium",
    misinformation: "medium",
    scam: "critical"
  };

  return severityMap[reason] || "low";
}