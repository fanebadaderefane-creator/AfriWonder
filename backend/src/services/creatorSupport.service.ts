/**
 * CDC Phase 1 - Support créateur via wallet (sans vidéo)
 * Commission 30% plateforme, 70% créateur (même modèle que tips vidéo)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import ledgerService from './ledger.service.js';
import commissionService from './commission.service.js';
import platformRevenueService from './platformRevenue.service.js';

async function getSellerWallet(userId: string) {
  const withdrawalService = (await import('./withdrawal.service.js')).default;
  return await withdrawalService.getSellerWallet(userId);
}

class CreatorSupportService {
  async supportCreator(supporterId: string, creatorId: string, data: { amount_fcfa: number; message?: string }) {
    if (supporterId === creatorId) {
      const error: any = new Error('Vous ne pouvez pas vous soutenir vous-même');
      error.statusCode = 400;
      throw error;
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, username: true, full_name: true },
    });
    if (!creator) {
      const error: any = new Error('Créateur non trouvé');
      error.statusCode = 404;
      throw error;
    }

    const { platform: platformFee, creator: creatorEarnings } = commissionService.videoSocialTips(data.amount_fcfa);

    const supporterWallet = await ledgerService.getOrCreateUserWallet(supporterId, 'XOF');
    const available = (supporterWallet as any).available_balance ?? supporterWallet.balance ?? 0;
    if (available < data.amount_fcfa) {
      const error: any = new Error('Solde insuffisant dans votre wallet');
      error.statusCode = 400;
      throw error;
    }

    const support = await prisma.creatorSupport.create({
      data: {
        supporter_id: supporterId,
        creator_id: creatorId,
        amount_fcfa: data.amount_fcfa,
        message: data.message,
        payment_method: 'wallet',
        creator_earnings: creatorEarnings,
        platform_fee: platformFee,
      },
    });

    await ledgerService.debit(supporterWallet.id, data.amount_fcfa, {
      referenceId: support.id,
      referenceType: 'other',
      description: `Support créateur @${creator.username}`,
    });

    const sellerWallet = await getSellerWallet(creatorId);
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: { balance: { increment: creatorEarnings } },
    });

    await platformRevenueService.addRevenue(
      platformFee,
      'gifts_tips',
      `Commission support créateur (${data.amount_fcfa} FCFA)`,
      support.id
    );

    await prisma.notification.create({
      data: {
        user_id: creatorId,
        type: 'tip_received',
        title: 'Nouveau support reçu ! 🎁',
        message: `Vous avez reçu un support de ${data.amount_fcfa} FCFA`,
        reference_id: support.id,
        reference_type: 'creator_support',
        from_user_id: supporterId,
      },
    });

    logger.info('Creator support completed', {
      supportId: support.id,
      supporterId,
      creatorId,
      amount: data.amount_fcfa,
    });

    return support;
  }

  async getCreatorSupportStats(creatorId: string) {
    const [total, sumAmount, recent] = await Promise.all([
      prisma.creatorSupport.count({ where: { creator_id: creatorId } }),
      prisma.creatorSupport.aggregate({
        where: { creator_id: creatorId },
        _sum: { amount_fcfa: true, creator_earnings: true },
      }),
      prisma.creatorSupport.findMany({
        where: { creator_id: creatorId },
        orderBy: { created_at: 'desc' },
        take: 20,
        include: {
          supporter: {
            select: { id: true, username: true, full_name: true, profile_image: true },
          },
        },
      }),
    ]);

    return {
      total_supports: total,
      total_amount_fcfa: sumAmount._sum.amount_fcfa || 0,
      total_creator_earnings: sumAmount._sum.creator_earnings || 0,
      recent,
    };
  }
}

export const creatorSupportService = new CreatorSupportService();
export default creatorSupportService;
