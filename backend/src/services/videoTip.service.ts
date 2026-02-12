import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import commissionService from './commission.service.js';

class VideoTipService {
  /**
   * Créer un tip pour une vidéo avec Orange Money
   * Commission plateforme : 30% (modèle AfriWonder - Vidéo social)
   */
  async createTip(senderId: string, videoId: string, data: {
    amount: number;
    phone: string;
    message?: string;
  }) {
    // Vérifier que la vidéo existe
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { creator: true },
    });

    if (!video) {
      const error: any = new Error('Vidéo non trouvée');
      error.statusCode = 404;
      throw error;
    }

    // Vérifier que l'utilisateur ne se donne pas un tip à lui-même
    if (senderId === video.creator_id) {
      const error: any = new Error('Vous ne pouvez pas vous donner un tip à vous-même');
      error.statusCode = 400;
      throw error;
    }

    // Calculer les montants (30% plateforme, 70% créateur - modèle AfriWonder)
    const { platform: afriwonderFee, creator: creatorEarnings } = commissionService.videoSocialTips(data.amount);

    // Créer le tip en attente
    const tip = await prisma.videoTip.create({
      data: {
        video_id: videoId,
        sender_id: senderId,
        receiver_id: video.creator_id,
        amount: data.amount,
        currency: 'XOF',
        payment_method: 'orange_money',
        message: data.message,
        status: 'pending',
        afriwonder_fee: afriwonderFee,
        creator_earnings: creatorEarnings,
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: senderId,
        type: 'video_tip',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Tip pour la vidéo "${video.title}"`,
        reference_id: tip.id,
      },
    });

    // Mettre à jour le tip avec la transaction
    await prisma.videoTip.update({
      where: { id: tip.id },
      data: { transaction_id: transaction.id },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        senderId,
        tip.id, // Utiliser le tip.id comme orderId
        {
          amount: data.amount,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/videos/${videoId}?tip=success`,
        }
      );

      logger.info('Tip créé et paiement Orange Money initié', {
        tipId: tip.id,
        videoId,
        senderId,
        receiverId: video.creator_id,
        amount: data.amount,
      });

      return {
        ...tip,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      // En cas d'erreur, mettre à jour le statut
      await prisma.videoTip.update({
        where: { id: tip.id },
        data: { status: 'failed' },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  /**
   * Vérifier et compléter un tip après paiement Orange Money
   */
  async completeTip(tipId: string, paymentStatus: string) {
    const tip = await prisma.videoTip.findUnique({
      where: { id: tipId },
      include: {
        transaction: true,
        receiver: true,
      },
    });

    if (!tip) {
      const error: any = new Error('Tip non trouvé');
      error.statusCode = 404;
      throw error;
    }

    if (tip.status === 'completed') {
      return { success: true, tip };
    }

    if (paymentStatus === 'SUCCESS' || paymentStatus === 'completed') {
      await prisma.videoTip.update({
        where: { id: tipId },
        data: { status: 'completed' },
      });

      // Mettre à jour la transaction
      if (tip.transaction) {
        await prisma.transaction.update({
          where: { id: tip.transaction.id },
          data: { status: 'completed' },
        });
      }

      // Créditer le wallet VENDEUR du créateur (90% du montant)
      // Les créateurs utilisent SellerWallet pour les tips/gifts
      const withdrawalService = (await import('./withdrawal.service.js')).default;
      const sellerWallet = await withdrawalService.getSellerWallet(tip.receiver_id);
      
      await prisma.sellerWallet.update({
        where: { id: sellerWallet.id },
        data: {
          balance: {
            increment: tip.creator_earnings,
          },
        },
      });

      // Créer une transaction pour le créateur
      await prisma.transaction.create({
        data: {
          user_id: tip.receiver_id,
          type: 'tip_received',
          amount: tip.creator_earnings,
          currency: 'XOF',
          status: 'completed',
          description: `Tip reçu pour la vidéo (${tip.amount} FCFA - commission: ${tip.afriwonder_fee} FCFA)`,
          reference_id: tip.id,
          payment_method: 'internal',
        },
      });

      // IMPORTANT: Créditer le wallet de la plateforme (10% commission)
      // La plateforme gagne sur TOUS les tips, même ceux faits par les créateurs
      await platformRevenueService.addRevenue(
        tip.afriwonder_fee,
        'video_tips',
        `Commission sur tip vidéo (${tip.amount} FCFA)`,
        tip.id
      );

      // Créer une notification pour le créateur
      await prisma.notification.create({
        data: {
          user_id: tip.receiver_id,
          type: 'tip_received',
          title: 'Nouveau tip reçu ! 🎁',
          message: `Vous avez reçu un tip de ${tip.amount} FCFA pour votre vidéo`,
          reference_id: tip.video_id,
          reference_type: 'video',
          from_user_id: tip.sender_id,
        },
      });

      logger.info('Tip complété avec succès', {
        tipId,
        receiverId: tip.receiver_id,
        amount: tip.amount,
        creatorEarnings: tip.creator_earnings,
      });

      return {
        success: true,
        tip,
      };
    } else {
      // Paiement échoué
      await prisma.videoTip.update({
        where: { id: tipId },
        data: { status: 'failed' },
      });

      if (tip.transaction) {
        await prisma.transaction.update({
          where: { id: tip.transaction.id },
          data: { status: 'failed' },
        });
      }

      return {
        success: false,
        tip,
      };
    }
  }

  /**
   * Obtenir les tips d'une vidéo
   */
  async getVideoTips(videoId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      prisma.videoTip.findMany({
        where: {
          video_id: videoId,
          status: 'completed', // Seulement les tips complétés
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.videoTip.count({
        where: {
          video_id: videoId,
          status: 'completed',
        },
      }),
    ]);

    return {
      tips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir les statistiques de tips d'un créateur
   */
  async getCreatorTipStats(creatorId: string) {
    const [totalTips, totalAmount, totalEarnings, recentTips] = await Promise.all([
      prisma.videoTip.count({
        where: {
          receiver_id: creatorId,
          status: 'completed',
        },
      }),
      prisma.videoTip.aggregate({
        where: {
          receiver_id: creatorId,
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.videoTip.aggregate({
        where: {
          receiver_id: creatorId,
          status: 'completed',
        },
        _sum: {
          creator_earnings: true,
        },
      }),
      prisma.videoTip.findMany({
        where: {
          receiver_id: creatorId,
          status: 'completed',
        },
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          video: {
            select: {
              id: true,
              title: true,
              thumbnail_url: true,
            },
          },
          sender: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
        },
      }),
    ]);

    return {
      totalTips,
      totalAmount: totalAmount._sum.amount || 0,
      totalEarnings: totalEarnings._sum.creator_earnings || 0,
      recentTips,
    };
  }
}

export const videoTipService = new VideoTipService();
export default videoTipService;

