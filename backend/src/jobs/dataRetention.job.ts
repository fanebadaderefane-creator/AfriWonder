import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Configuration des politiques de rétention par défaut
 */
const DEFAULT_RETENTION_POLICIES = [
  {
    data_type: 'security_logs',
    retention_days: 365, // 1 an
    description: 'Logs de sécurité conservés pendant 1 an',
  },
  {
    data_type: 'notifications',
    retention_days: 90, // 3 mois
    description: 'Notifications conservées pendant 3 mois',
  },
  {
    data_type: 'notification_logs',
    retention_days: 60, // 2 mois
    description: 'Logs de notifications conservés pendant 2 mois',
  },
  {
    data_type: 'messages',
    retention_days: 730, // 2 ans
    description: 'Messages conservés pendant 2 ans',
  },
  {
    data_type: 'sessions',
    retention_days: 30, // 1 mois
    description: 'Sessions expirées nettoyées après 1 mois',
  },
  {
    data_type: 'guest_cookie_consents',
    retention_days: 395, // ~13 mois (expire automatiquement après 1 an)
    description: 'Consentements cookies invités nettoyés',
  },
  {
    data_type: 'data_export_requests',
    retention_days: 90, // 3 mois
    description: 'Demandes d\'export conservées 3 mois après expiration',
  },
  {
    data_type: 'suspicious_activity_alerts',
    retention_days: 180, // 6 mois
    description: 'Alertes d\'activités suspectes résolues conservées 6 mois',
  },
  {
    data_type: 'admin_audit_logs',
    retention_days: 1825, // 5 ans (obligation légale)
    description: 'Logs d\'audit admin conservés 5 ans',
  },
  {
    data_type: 'consent_logs',
    retention_days: 1095, // 3 ans (preuve de consentement)
    description: 'Logs de consentement conservés 3 ans',
  },
];

const RETENTION_INIT_MAX_RETRIES = 3;
const RETENTION_INIT_RETRY_DELAY_MS = 2000;

/**
 * Initialiser les politiques de rétention par défaut (avec retry en cas de timeout connexion)
 */
export async function initializeRetentionPolicies() {
  let lastError: any;
  for (let attempt = 1; attempt <= RETENTION_INIT_MAX_RETRIES; attempt++) {
    try {
      logger.info('📋 Initialisation des politiques de rétention...', attempt > 1 ? { attempt } : undefined);

      for (const policy of DEFAULT_RETENTION_POLICIES) {
        await prisma.dataRetentionPolicy.upsert({
          where: { data_type: policy.data_type },
          update: {},
          create: policy,
        });
      }

      logger.info('✅ Politiques de rétention initialisées');
      return;
    } catch (error: any) {
      lastError = error;
      const isTimeout = /connection timeout|Connection terminated/i.test(error?.message || '');
      if (isTimeout && attempt < RETENTION_INIT_MAX_RETRIES) {
        logger.warn(`⏳ Timeout lors de l'init des politiques (tentative ${attempt}/${RETENTION_INIT_MAX_RETRIES}), nouvel essai dans ${RETENTION_INIT_RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETENTION_INIT_RETRY_DELAY_MS));
      } else {
        break;
      }
    }
  }
  logger.error('❌ Erreur lors de l\'initialisation des politiques:', lastError);
}

/**
 * Appliquer les politiques de rétention
 */
export async function applyRetentionPolicies() {
  try {
    logger.info('🔄 Démarrage du job de rétention des données...');

    const policies = await prisma.dataRetentionPolicy.findMany({
      where: { auto_delete_enabled: true },
    });

    if (policies.length === 0) {
      logger.info('✅ Aucune politique de rétention active');
      return {
        success: true,
        cleaned: 0,
      };
    }

    const results = {
      success: 0,
      failed: 0,
      totalDeleted: 0,
    };

    for (const policy of policies) {
      try {
        logger.info(`🧹 Application de la politique: ${policy.data_type} (${policy.retention_days} jours)`);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

        let deletedCount = 0;

        switch (policy.data_type) {
          case 'security_logs':
            deletedCount = await cleanSecurityLogs(cutoffDate);
            break;
          case 'notifications':
            deletedCount = await cleanNotifications(cutoffDate);
            break;
          case 'notification_logs':
            deletedCount = await cleanNotificationLogs(cutoffDate);
            break;
          case 'guest_cookie_consents':
            deletedCount = await cleanGuestCookieConsents(cutoffDate);
            break;
          case 'data_export_requests':
            deletedCount = await cleanDataExportRequests(cutoffDate);
            break;
          case 'suspicious_activity_alerts':
            deletedCount = await cleanSuspiciousActivityAlerts(cutoffDate);
            break;
          default:
            logger.warn(`⚠️ Type de données non géré: ${policy.data_type}`);
        }

        // Mettre à jour la date du dernier nettoyage
        await prisma.dataRetentionPolicy.update({
          where: { id: policy.id },
          data: { last_cleanup_at: new Date() },
        });

        results.success++;
        results.totalDeleted += deletedCount;

        logger.info(`✅ ${deletedCount} enregistrement(s) supprimé(s) pour ${policy.data_type}`);
      } catch (error: any) {
        results.failed++;
        logger.error(`❌ Erreur lors du nettoyage de ${policy.data_type}:`, error);
      }
    }

    logger.info(`✅ Job de rétention terminé: ${results.totalDeleted} enregistrement(s) supprimé(s)`);

    return {
      success: true,
      cleaned: results.totalDeleted,
      policies_applied: results.success,
      policies_failed: results.failed,
    };
  } catch (error: any) {
    logger.error('❌ Erreur dans le job de rétention:', error);
    throw error;
  }
}

// Fonctions de nettoyage par type de données

async function cleanSecurityLogs(cutoffDate: Date): Promise<number> {
  const result = await prisma.securityLog.deleteMany({
    where: {
      created_at: { lt: cutoffDate },
      // Ne pas supprimer les logs avec score de risque élevé
      risk_score: { lt: 50 },
    },
  });
  return result.count;
}

async function cleanNotifications(cutoffDate: Date): Promise<number> {
  const result = await prisma.notification.deleteMany({
    where: {
      created_at: { lt: cutoffDate },
      is_read: true,
    },
  });
  return result.count;
}

async function cleanNotificationLogs(cutoffDate: Date): Promise<number> {
  const result = await prisma.notificationLog.deleteMany({
    where: {
      sent_at: { lt: cutoffDate },
    },
  });
  return result.count;
}

async function cleanGuestCookieConsents(cutoffDate: Date): Promise<number> {
  const result = await prisma.guestCookieConsent.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { created_at: { lt: cutoffDate } },
      ],
    },
  });
  return result.count;
}

async function cleanDataExportRequests(cutoffDate: Date): Promise<number> {
  const result = await prisma.dataExportRequest.deleteMany({
    where: {
      OR: [
        {
          status: 'completed',
          expires_at: { lt: cutoffDate },
        },
        {
          status: 'failed',
          requested_at: { lt: cutoffDate },
        },
      ],
    },
  });
  return result.count;
}

async function cleanSuspiciousActivityAlerts(cutoffDate: Date): Promise<number> {
  const result = await prisma.suspiciousActivityAlert.deleteMany({
    where: {
      status: { in: ['resolved', 'false_positive'] },
      created_at: { lt: cutoffDate },
    },
  });
  return result.count;
}

/**
 * Démarrer le job automatique de rétention
 */
export function startDataRetentionJob() {
  // Exécuter le job tous les jours à 2h du matin
  const interval = 24 * 60 * 60 * 1000; // 24 heures

  setInterval(async () => {
    try {
      await applyRetentionPolicies();
    } catch (error) {
      logger.error('Error in data retention job:', error);
    }
  }, interval);

  logger.info('✅ Job de rétention des données démarré');
}

export default {
  initializeRetentionPolicies,
  applyRetentionPolicies,
  startDataRetentionJob,
};
