import prisma from '../config/database.js';
import privacyService from '../services/privacy.service.js';
import { logger } from '../utils/logger.js';

/**
 * Job pour supprimer automatiquement les comptes dont la période de grâce (30 jours) est expirée
 */
export async function processScheduledAccountDeletions() {
  try {
    logger.info('🔄 Démarrage du job de suppression automatique des comptes...');

    const now = new Date();

    // Trouver les demandes de suppression arrivées à échéance
    const pendingDeletions = await prisma.accountDeletionRequest.findMany({
      where: {
        status: 'pending',
        scheduled_deletion_at: {
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (pendingDeletions.length === 0) {
      logger.info('✅ Aucun compte à supprimer');
      return {
        success: true,
        deleted: 0,
        message: 'No accounts to delete',
      };
    }

    logger.info(`📋 ${pendingDeletions.length} compte(s) à supprimer`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const deletion of pendingDeletions) {
      try {
        logger.info(`🗑️ Suppression du compte ${deletion.user.username} (${deletion.user_id})...`);

        // Supprimer le compte
        await privacyService.permanentlyDeleteAccount(deletion.user_id);

        results.success++;
        logger.info(`✅ Compte ${deletion.user.username} supprimé avec succès`);
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to delete ${deletion.user.username}: ${error.message}`);
        logger.error(`❌ Erreur lors de la suppression de ${deletion.user.username}:`, error);
      }
    }

    logger.info(`✅ Job de suppression terminé: ${results.success} réussi(s), ${results.failed} échoué(s)`);

    return {
      success: true,
      deleted: results.success,
      failed: results.failed,
      errors: results.errors,
    };
  } catch (error: any) {
    logger.error('❌ Erreur dans le job de suppression des comptes:', error);
    throw error;
  }
}

/**
 * Job pour envoyer des rappels avant suppression (7 jours avant)
 */
export async function sendDeletionReminders() {
  try {
    logger.info('📧 Démarrage du job de rappels de suppression...');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Trouver les suppressions programmées dans 7 jours
    const upcomingDeletions = await prisma.accountDeletionRequest.findMany({
      where: {
        status: 'pending',
        scheduled_deletion_at: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
          },
        },
      },
    });

    if (upcomingDeletions.length === 0) {
      logger.info('✅ Aucun rappel à envoyer');
      return {
        success: true,
        sent: 0,
      };
    }

    logger.info(`📋 ${upcomingDeletions.length} rappel(s) à envoyer`);

    for (const deletion of upcomingDeletions) {
      try {
        // Créer une notification
        await prisma.notification.create({
          data: {
            user_id: deletion.user_id,
            type: 'account_deletion_reminder',
            title: 'Suppression de compte imminente',
            message: `Votre compte sera définitivement supprimé le ${deletion.scheduled_deletion_at.toLocaleDateString('fr-FR')}. Vous pouvez encore annuler cette demande.`,
            data: {
              deletion_id: deletion.id,
              scheduled_date: deletion.scheduled_deletion_at,
              cancellation_url: `/api/privacy/cancel-deletion/${deletion.cancellation_token}`,
            },
          },
        });

        // TODO: Envoyer un email

        logger.info(`✅ Rappel envoyé à ${deletion.user.username}`);
      } catch (error: any) {
        logger.error(`❌ Erreur lors de l'envoi du rappel à ${deletion.user.username}:`, error);
      }
    }

    logger.info(`✅ Job de rappels terminé`);

    return {
      success: true,
      sent: upcomingDeletions.length,
    };
  } catch (error: any) {
    logger.error('❌ Erreur dans le job de rappels de suppression:', error);
    throw error;
  }
}

/**
 * Démarrer les jobs automatiques (à appeler au démarrage de l'application)
 */
export function startAccountDeletionJobs() {
  // Exécuter le job de suppression toutes les 24 heures
  const deletionInterval = 24 * 60 * 60 * 1000; // 24 heures

  setInterval(async () => {
    try {
      await processScheduledAccountDeletions();
    } catch (error) {
      logger.error('Error in account deletion job:', error);
    }
  }, deletionInterval);

  // Exécuter le job de rappels tous les jours à 10h
  const reminderInterval = 24 * 60 * 60 * 1000; // 24 heures

  setInterval(async () => {
    try {
      await sendDeletionReminders();
    } catch (error) {
      logger.error('Error in deletion reminder job:', error);
    }
  }, reminderInterval);

  logger.info('✅ Jobs de suppression de compte démarrés');
}

export default {
  processScheduledAccountDeletions,
  sendDeletionReminders,
  startAccountDeletionJobs,
};
