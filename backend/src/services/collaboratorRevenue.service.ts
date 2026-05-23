import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';

/**
 * Service pour gérer les revenus des collaborateurs sur les vidéos
 * Commission plateforme : 5% sur les revenus partagés
 */
class CollaboratorRevenueService {
  private readonly PLATFORM_COMMISSION_RATE = 0.05;

  /**
   * Distribuer les revenus d'une vidéo aux collaborateurs
   */
  async distributeRevenue(videoId: string, totalRevenue: number) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        creator: true,
        collaborator_revenues: true,
      },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    // Calculer le total des pourcentages
    const totalPercentage = video.collaborator_revenues.reduce(
      (sum, rev) => sum + rev.contribution_percentage,
      0
    );

    if (totalPercentage > 100) {
      throw new Error('Total contribution percentage cannot exceed 100%');
    }

    // Distribuer aux collaborateurs
    for (const collabRevenue of video.collaborator_revenues) {
      const collaboratorAmount = (totalRevenue * collabRevenue.contribution_percentage) / 100;
      const platformFee = collaboratorAmount * this.PLATFORM_COMMISSION_RATE;
      const collaboratorEarnings = collaboratorAmount - platformFee;

      // Mettre à jour les revenus du collaborateur
      await prisma.collaboratorRevenue.update({
        where: { id: collabRevenue.id },
        data: {
          collaborator_earnings: collaboratorEarnings,
          status: 'completed',
        },
      });

      // Créditer le wallet du collaborateur
      const sellerWallet = await withdrawalService.getSellerWallet(collabRevenue.collaborator_id);
      
      await prisma.sellerWallet.update({
        where: { id: sellerWallet.id },
        data: {
          balance: {
            increment: collaboratorEarnings,
          },
        },
      });

      // Créer transaction pour le collaborateur
      await prisma.transaction.create({
        data: {
          user_id: collabRevenue.collaborator_id,
          type: 'collaborator_revenue',
          amount: collaboratorEarnings,
          currency: 'XOF',
          status: 'completed',
          description: `Revenu collaborateur - Vidéo "${video.title}" (${collaboratorAmount} FCFA - commission: ${platformFee} FCFA)`,
          reference_id: collabRevenue.id,
          payment_method: 'internal',
        },
      });

      // Créditer la plateforme (commission 5%)
      await platformRevenueService.addRevenue(
        platformFee,
        'collaborator_revenue',
        `Commission revenu collaborateur - Vidéo "${video.title}" (${collaboratorAmount} FCFA)`,
        collabRevenue.id
      );
    }

    logger.info('Collaborator revenue distributed', {
      videoId,
      totalRevenue,
      collaboratorsCount: video.collaborator_revenues.length,
    });
  }
}

export const collaboratorRevenueService = new CollaboratorRevenueService();
export default collaboratorRevenueService;

