/**
 * Account Deletion Service (GDPR Article 17 - Right to Erasure)
 * Gère la suppression complète des comptes utilisateurs
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

class AccountDeletionService {
  private readonly DELETION_DELAY_DAYS = 30; // Délai avant suppression définitive

  /**
   * Créer une demande de suppression de compte
   */
  async createDeletionRequest(
    userId: string,
    reason?: string,
    ipAddress?: string
  ) {
    try {
      // Vérifier si une demande est déjà en cours
      const existingRequest = await prisma.accountDeletionRequest.findFirst({
        where: {
          user_id: userId,
          status: 'pending',
        },
      });

      if (existingRequest) {
        throw new Error('Une demande de suppression est déjà en cours');
      }

      // Calculer la date de suppression programmée
      const scheduledDeletionAt = new Date();
      scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + this.DELETION_DELAY_DAYS);

      // Générer un token d'annulation
      const cancellationToken = crypto.randomBytes(32).toString('hex');

      const request = await prisma.accountDeletionRequest.create({
        data: {
          user_id: userId,
          reason,
          scheduled_deletion_at: scheduledDeletionAt,
          cancellation_token: cancellationToken,
          status: 'pending',
          ip_address: ipAddress,
        },
      });

      // Soft delete immédiat du compte (désactivation)
      await this.softDeleteUser(userId);

      logger.info('Demande de suppression de compte créée', {
        requestId: request.id,
        userId,
        scheduledDeletionAt,
      });

      // TODO: Envoyer email de confirmation avec lien d'annulation

      return request;
    } catch (error: any) {
      logger.error('Erreur lors de la création de la demande de suppression', { error, userId });
      throw error;
    }
  }

  /**
   * Soft delete d'un utilisateur (désactivation immédiate)
   */
  private async softDeleteUser(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          is_verified: false,
          // On pourrait ajouter un champ 'deleted_at' ou 'status' = 'deleted'
        },
      });

      // Déconnecter l'utilisateur de tous les appareils
      // TODO: Invalider tous les tokens JWT/sessions

      logger.info('Compte soft deleted', { userId });
    } catch (error: any) {
      logger.error('Erreur lors du soft delete', { error, userId });
      throw error;
    }
  }

  /**
   * Annuler une demande de suppression
   */
  async cancelDeletionRequest(cancellationToken: string) {
    try {
      const request = await prisma.accountDeletionRequest.findUnique({
        where: { cancellation_token: cancellationToken },
      });

      if (!request) {
        throw new Error('Demande de suppression non trouvée');
      }

      if (request.status !== 'pending') {
        throw new Error('Cette demande ne peut plus être annulée');
      }

      // Mettre à jour le statut
      await prisma.accountDeletionRequest.update({
        where: { id: request.id },
        data: { status: 'cancelled' },
      });

      // Réactiver le compte
      await prisma.user.update({
        where: { id: request.user_id },
        data: {
          is_verified: true,
        },
      });

      logger.info('Demande de suppression annulée', {
        requestId: request.id,
        userId: request.user_id,
      });

      return request;
    } catch (error: any) {
      logger.error('Erreur lors de l\'annulation de la demande', { error, cancellationToken });
      throw error;
    }
  }

  /**
   * Traiter les suppressions programmées
   * À exécuter quotidiennement via un cron job
   */
  async processScheduledDeletions() {
    try {
      const requestsToDelete = await prisma.accountDeletionRequest.findMany({
        where: {
          status: 'pending',
          scheduled_deletion_at: {
            lte: new Date(),
          },
        },
      });

      logger.info('Traitement des suppressions programmées', { count: requestsToDelete.length });

      for (const request of requestsToDelete) {
        try {
          await this.permanentlyDeleteUser(request.user_id);

          await prisma.accountDeletionRequest.update({
            where: { id: request.id },
            data: {
              status: 'completed',
              deleted_at: new Date(),
            },
          });

          logger.info('Compte supprimé définitivement', { userId: request.user_id });
        } catch (error: any) {
          logger.error('Erreur lors de la suppression d\'un compte', {
            error,
            requestId: request.id,
            userId: request.user_id,
          });
        }
      }

      return requestsToDelete.length;
    } catch (error: any) {
      logger.error('Erreur lors du traitement des suppressions programmées', { error });
      throw error;
    }
  }

  /**
   * Suppression définitive d'un utilisateur et de toutes ses données
   */
  private async permanentlyDeleteUser(userId: string) {
    try {
      logger.info('Début de la suppression définitive', { userId });

      // Supprimer les données en cascade (grâce aux relations Prisma)
      // Les données seront supprimées automatiquement grâce à onDelete: Cascade

      // Cependant, certaines données doivent être anonymisées plutôt que supprimées
      // (obligations légales comptables, historique des transactions)

      // Anonymiser les transactions (garder pour comptabilité)
      await prisma.transaction.updateMany({
        where: { user_id: userId },
        data: {
          // Les montants et types restent pour la comptabilité
          // mais on peut anonymiser certaines métadonnées
        },
      });

      // Anonymiser les commandes (garder pour obligations fiscales)
      await prisma.order.updateMany({
        where: { user_id: userId },
        data: {
          shipping_address: 'DELETED',
          billing_address: 'DELETED',
        },
      });

      // TODO: Supprimer les fichiers stockés (images, vidéos)
      // await this.deleteUserFiles(userId);

      // Supprimer l'utilisateur (cascade supprime tout le reste)
      await prisma.user.delete({
        where: { id: userId },
      });

      logger.info('Suppression définitive terminée', { userId });
    } catch (error: any) {
      logger.error('Erreur lors de la suppression définitive', { error, userId });
      throw error;
    }
  }

  /**
   * Obtenir le statut d'une demande de suppression
   */
  async getDeletionRequestStatus(userId: string) {
    try {
      const request = await prisma.accountDeletionRequest.findFirst({
        where: {
          user_id: userId,
          status: 'pending',
        },
        orderBy: {
          requested_at: 'desc',
        },
      });

      return request;
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du statut de suppression', { error, userId });
      throw error;
    }
  }

  /**
   * Obtenir toutes les demandes de suppression d'un utilisateur
   */
  async getUserDeletionRequests(userId: string) {
    try {
      const requests = await prisma.accountDeletionRequest.findMany({
        where: { user_id: userId },
        orderBy: { requested_at: 'desc' },
      });

      return requests;
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des demandes de suppression', { error, userId });
      throw error;
    }
  }
}

export default new AccountDeletionService();
