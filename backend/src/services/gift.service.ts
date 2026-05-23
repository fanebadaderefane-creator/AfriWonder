import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';

/**
 * Service pour gérer les gifts généraux (hors live)
 * Commission plateforme : 12%
 */
class GiftService {
  /** Aligné Phase 9 (cadeaux hors live) : même split plateforme que les lives (30 %). */
  private readonly PLATFORM_COMMISSION_RATE = 0.3;

  /**
   * Envoyer un gift à un utilisateur
   */
  async sendGift(senderId: string, recipientId: string, data: {
    giftId: string;
    phone: string;
    message?: string;
  }) {
    const gift = await prisma.gift.findUnique({
      where: { id: data.giftId },
    });

    if (!gift || !gift.is_active) {
      throw new Error('Gift not found or not available');
    }

    if (senderId === recipientId) {
      throw new Error('Cannot send gift to yourself');
    }

    // Calculer les montants
    const platformFee = gift.price * this.PLATFORM_COMMISSION_RATE;
    const recipientEarnings = gift.price - platformFee;

    // Créer la transaction de gift
    const giftTransaction = await prisma.giftTransaction.create({
      data: {
        gift_id: data.giftId,
        sender_id: senderId,
        recipient_id: recipientId,
        amount: gift.price,
        message: data.message,
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: senderId,
        type: 'gift_payment',
        amount: gift.price,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Gift - ${gift.name}`,
        reference_id: giftTransaction.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        senderId,
        transaction.id,
        {
          amount: gift.price,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/users/${recipientId}?gift=success`,
        }
      );

      logger.info('Gift sent and Orange Money payment initiated', {
        giftTransactionId: giftTransaction.id,
        senderId,
        recipientId,
        amount: gift.price,
      });

      return {
        ...giftTransaction,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      await prisma.giftTransaction.delete({ where: { id: giftTransaction.id } });
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Confirmer le paiement d'un gift
   */
  async confirmGiftPayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'gift_payment') {
      throw new Error('Transaction not found or invalid type');
    }

    const giftTransaction = await prisma.giftTransaction.findUnique({
      where: { id: transaction.reference_id! },
      include: {
        gift: true,
      },
    });

    if (!giftTransaction) {
      throw new Error('Gift transaction not found');
    }

    // Calculer les montants
    const platformFee = transaction.amount * this.PLATFORM_COMMISSION_RATE;
    const recipientEarnings = transaction.amount - platformFee;

    // Mettre à jour la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'completed',
      },
    });

    // Créditer le wallet du destinataire
    const sellerWallet = await withdrawalService.getSellerWallet(giftTransaction.recipient_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: recipientEarnings,
        },
      },
    });

    // Créer transaction pour le destinataire
    await prisma.transaction.create({
      data: {
        user_id: giftTransaction.recipient_id,
        type: 'gift_received',
        amount: recipientEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Gift reçu - ${giftTransaction.gift.name} (${transaction.amount} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: transactionId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 12%)
    await platformRevenueService.addRevenue(
      platformFee,
      'gifts',
      `Commission gift - ${giftTransaction.gift.name} (${transaction.amount} FCFA)`,
      transactionId
    );

    logger.info('Gift payment confirmed', {
      transactionId,
      giftTransactionId: giftTransaction.id,
      recipientEarnings,
      platformFee,
    });

    return {
      transaction,
      giftTransaction,
    };
  }
}

export const giftService = new GiftService();
export default giftService;

