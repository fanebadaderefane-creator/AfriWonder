/**
 * Data Export Service (GDPR Article 20 - Right to Data Portability)
 * Permet aux utilisateurs d'exporter toutes leurs données
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

class DataExportService {
  private readonly EXPORT_DIR = path.join(process.cwd(), 'exports');
  private readonly EXPORT_EXPIRY_DAYS = 7;

  /**
   * Créer une demande d'export de données
   */
  async createExportRequest(
    userId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    ipAddress?: string
  ) {
    try {
      const request = await prisma.dataExportRequest.create({
        data: {
          user_id: userId,
          format,
          status: 'pending',
          ip_address: ipAddress,
        },
      });

      logger.info('Demande d\'export de données créée', { requestId: request.id, userId, format });

      // Lancer l'export en arrière-plan
      this.processExport(request.id).catch(error => {
        logger.error('Erreur lors du traitement de l\'export', { error, requestId: request.id });
      });

      return request;
    } catch (error: any) {
      logger.error('Erreur lors de la création de la demande d\'export', { error, userId });
      throw error;
    }
  }

  /**
   * Traiter une demande d'export
   */
  private async processExport(requestId: string) {
    try {
      // Mettre à jour le statut à "processing"
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: { status: 'processing' },
      });

      const request = await prisma.dataExportRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error('Demande d\'export non trouvée');
      }

      // Collecter toutes les données de l'utilisateur
      const data = await this.collectUserData(request.user_id);

      // Créer le fichier d'export
      const exportPath = await this.createExportFile(requestId, data, request.format);

      // Calculer la taille du fichier
      const stats = await fs.stat(exportPath);
      const fileSize = stats.size;

      // Calculer la date d'expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.EXPORT_EXPIRY_DAYS);

      // Générer l'URL de téléchargement
      const downloadUrl = `/api/user/data-export/download/${requestId}`;

      // Mettre à jour la demande
      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          expires_at: expiresAt,
          download_url: downloadUrl,
          file_size: BigInt(fileSize),
        },
      });

      logger.info('Export de données terminé', {
        requestId,
        userId: request.user_id,
        fileSize,
      });

      // TODO: Envoyer une notification à l'utilisateur
    } catch (error: any) {
      logger.error('Erreur lors du traitement de l\'export', { error, requestId });

      await prisma.dataExportRequest.update({
        where: { id: requestId },
        data: {
          status: 'failed',
          error_message: error.message,
        },
      });
    }
  }

  /**
   * Collecter toutes les données d'un utilisateur
   */
  private async collectUserData(userId: string) {
    try {
      // Récupérer toutes les données de l'utilisateur
      const [
        user,
        videos,
        comments,
        likes,
        follows,
        orders,
        products,
        messages,
        transactions,
        liveStreams,
        subscriptions,
        notifications,
        addresses,
        reviews,
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            username: true,
            full_name: true,
            country: true,
            created_at: true,
            updated_at: true,
          },
        }),
        prisma.video.findMany({
          where: { creator_id: userId },
          select: {
            id: true,
            title: true,
            description: true,
            views: true,
            likes: true,
            created_at: true,
          },
        }),
        prisma.comment.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        }),
        prisma.like.findMany({
          where: { user_id: userId },
          select: {
            video_id: true,
            created_at: true,
          },
        }),
        prisma.follow.findMany({
          where: { follower_id: userId },
          select: {
            following_id: true,
            created_at: true,
          },
        }),
        prisma.order.findMany({
          where: { user_id: userId },
          include: {
            items: true,
          },
        }),
        prisma.product.findMany({
          where: { seller_id: userId },
          select: {
            id: true,
            name: true,
            price: true,
            status: true,
            created_at: true,
          },
        }),
        prisma.message.findMany({
          where: { sender_id: userId },
          select: {
            id: true,
            content: true,
            created_at: true,
          },
        }),
        prisma.transaction.findMany({
          where: { user_id: userId },
          select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            created_at: true,
          },
        }),
        prisma.liveStream.findMany({
          where: { creator_id: userId },
          select: {
            id: true,
            title: true,
            started_at: true,
            ended_at: true,
          },
        }),
        prisma.subscription.findMany({
          where: { subscriber_id: userId },
          select: {
            subscribed_to_id: true,
            created_at: true,
          },
        }),
        prisma.notification.findMany({
          where: { user_id: userId },
          select: {
            type: true,
            content: true,
            is_read: true,
            created_at: true,
          },
          take: 100,
          orderBy: { created_at: 'desc' },
        }),
        prisma.address.findMany({
          where: { user_id: userId },
        }),
        prisma.review.findMany({
          where: { user_id: userId },
          select: {
            rating: true,
            content: true,
            created_at: true,
          },
        }),
      ]);

      return {
        export_info: {
          export_date: new Date().toISOString(),
          user_id: userId,
          data_format: 'JSON',
        },
        personal_info: user,
        content: {
          videos: videos,
          comments: comments,
          likes: likes,
          follows: follows,
          subscriptions: subscriptions,
        },
        marketplace: {
          orders: orders,
          products: products,
          reviews: reviews,
        },
        communications: {
          messages: messages,
          notifications: notifications,
        },
        financial: {
          transactions: transactions,
        },
        live_streams: liveStreams,
        addresses: addresses,
      };
    } catch (error: any) {
      logger.error('Erreur lors de la collecte des données utilisateur', { error, userId });
      throw error;
    }
  }

  /**
   * Créer le fichier d'export
   */
  private async createExportFile(requestId: string, data: any, format: string): Promise<string> {
    try {
      // Créer le répertoire d'export s'il n'existe pas
      await fs.mkdir(this.EXPORT_DIR, { recursive: true });

      if (format === 'json') {
        const filePath = path.join(this.EXPORT_DIR, `${requestId}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
        return filePath;
      } else if (format === 'csv') {
        // TODO: Implémenter l'export CSV
        throw new Error('Format CSV pas encore implémenté');
      } else if (format === 'pdf') {
        // TODO: Implémenter l'export PDF
        throw new Error('Format PDF pas encore implémenté');
      } else {
        throw new Error('Format non supporté');
      }
    } catch (error: any) {
      logger.error('Erreur lors de la création du fichier d\'export', { error, requestId });
      throw error;
    }
  }

  /**
   * Récupérer une demande d'export
   */
  async getExportRequest(requestId: string, userId: string) {
    try {
      const request = await prisma.dataExportRequest.findFirst({
        where: {
          id: requestId,
          user_id: userId,
        },
      });

      if (!request) {
        throw new Error('Demande d\'export non trouvée');
      }

      return request;
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de la demande d\'export', { error, requestId });
      throw error;
    }
  }

  /**
   * Obtenir toutes les demandes d'export d'un utilisateur
   */
  async getUserExportRequests(userId: string) {
    try {
      const requests = await prisma.dataExportRequest.findMany({
        where: { user_id: userId },
        orderBy: { requested_at: 'desc' },
        take: 10,
      });

      return requests;
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des demandes d\'export', { error, userId });
      throw error;
    }
  }

  /**
   * Obtenir le chemin du fichier d'export
   */
  getExportFilePath(requestId: string): string {
    return path.join(this.EXPORT_DIR, `${requestId}.json`);
  }

  /**
   * Nettoyer les exports expirés
   */
  async cleanupExpiredExports() {
    try {
      const expiredRequests = await prisma.dataExportRequest.findMany({
        where: {
          status: 'completed',
          expires_at: {
            lt: new Date(),
          },
        },
      });

      for (const request of expiredRequests) {
        try {
          const filePath = this.getExportFilePath(request.id);
          await fs.unlink(filePath);
        } catch (error) {
          logger.warn('Impossible de supprimer le fichier d\'export', { requestId: request.id });
        }
      }

      // Supprimer les demandes de la base de données
      await prisma.dataExportRequest.deleteMany({
        where: {
          status: 'completed',
          expires_at: {
            lt: new Date(),
          },
        },
      });

      logger.info('Exports expirés nettoyés', { count: expiredRequests.length });

      return expiredRequests.length;
    } catch (error: any) {
      logger.error('Erreur lors du nettoyage des exports expirés', { error });
      throw error;
    }
  }
}

export default new DataExportService();
