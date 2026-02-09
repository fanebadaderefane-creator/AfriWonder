import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';

/**
 * Service pour gérer les appels directs payants
 * Commission plateforme : 25% (comme OnlyFans)
 */
class DirectCallService {
  private readonly PLATFORM_COMMISSION_RATE = 0.25;
  private readonly MINUTE_RATE = 500; // 500 FCFA par minute

  /**
   * Initier un appel payant
   */
  async initiateCall(callerId: string, receiverId: string, data: {
    phone: string;
    estimatedDuration?: number; // En minutes
  }) {
    if (callerId === receiverId) {
      throw new Error('Cannot call yourself');
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new Error('Receiver not found');
    }

    // Calculer le montant estimé (minimum 1 minute)
    const estimatedMinutes = data.estimatedDuration || 1;
    const estimatedAmount = this.MINUTE_RATE * estimatedMinutes;

    // Créer l'appel en attente
    const call = await prisma.directCall.create({
      data: {
        caller_id: callerId,
        receiver_id: receiverId,
        status: 'pending',
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: callerId,
        type: 'call_payment',
        amount: estimatedAmount,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Appel direct - ${receiver.username || receiver.full_name || 'Utilisateur'}`,
        reference_id: call.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        callerId,
        transaction.id,
        {
          amount: estimatedAmount,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/calls/${call.id}?initiated=success`,
        }
      );

      logger.info('Direct call initiated and Orange Money payment initiated', {
        callId: call.id,
        callerId,
        receiverId,
        estimatedAmount,
      });

      return {
        ...call,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
        estimatedAmount,
      };
    } catch (error: any) {
      await prisma.directCall.delete({ where: { id: call.id } });
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Terminer un appel et calculer le montant final
   */
  async endCall(callId: string, duration: number) {
    const call = await prisma.directCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    // Calculer le montant final basé sur la durée réelle
    const minutes = Math.ceil(duration / 60); // Convertir secondes en minutes
    const finalAmount = this.MINUTE_RATE * minutes;

    // Calculer les montants
    const platformFee = finalAmount * this.PLATFORM_COMMISSION_RATE;
    const receiverEarnings = finalAmount - platformFee;

    // Mettre à jour l'appel
    await prisma.directCall.update({
      where: { id: callId },
      data: {
        status: 'completed',
        started_at: call.started_at || new Date(),
        ended_at: new Date(),
        duration: duration,
      },
    });

    // Mettre à jour la transaction avec le montant final
    await prisma.transaction.updateMany({
      where: {
        reference_id: callId,
        type: 'call_payment',
      },
      data: {
        amount: finalAmount,
        status: 'completed',
      },
    });

    // Créditer le wallet du receveur
    const sellerWallet = await withdrawalService.getSellerWallet(call.receiver_id);
    
    await prisma.sellerWallet.update({
      where: { id: sellerWallet.id },
      data: {
        balance: {
          increment: receiverEarnings,
        },
      },
    });

    // Créer transaction pour le receveur
    await prisma.transaction.create({
      data: {
        user_id: call.receiver_id,
        type: 'call_received',
        amount: receiverEarnings,
        currency: 'XOF',
        status: 'completed',
        description: `Appel reçu - ${minutes} minute(s) (${finalAmount} FCFA - commission: ${platformFee} FCFA)`,
        reference_id: callId,
        payment_method: 'internal',
      },
    });

    // Créditer la plateforme (commission 25%)
    await platformRevenueService.addRevenue(
      platformFee,
      'direct_calls',
      `Commission appel direct - ${minutes} minute(s) (${finalAmount} FCFA)`,
      callId
    );

    logger.info('Direct call ended and payment processed', {
      callId,
      duration: minutes,
      finalAmount,
      receiverEarnings,
      platformFee,
    });

    return {
      call,
      finalAmount,
      duration: minutes,
    };
  }
}

export const directCallService = new DirectCallService();
export default directCallService;

