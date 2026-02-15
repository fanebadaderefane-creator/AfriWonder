import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

/**
 * Service pour gérer les retraits des créateurs
 * Les créateurs peuvent retirer leur argent depuis leur wallet vers leur compte Orange Money
 */
class WithdrawalService {
  // Prompt: min 5 000 FCFA (Orange Money, MTN, Wave)
  private readonly MIN_WITHDRAWAL_AMOUNT = 5_000;
  private readonly WITHDRAWAL_FEE_FIXED = 500;
  // CDC: délai retrait 24–48h paramétrable via WITHDRAWAL_DELAY_HOURS (défaut: 48)
  private readonly WITHDRAWAL_DELAY_HOURS = (() => {
    const val = parseInt(process.env.WITHDRAWAL_DELAY_HOURS || '48', 10);
    return Number.isNaN(val) ? 48 : Math.max(24, Math.min(48, val));
  })();

  /**
   * Obtenir ou créer le wallet vendeur d'un utilisateur
   */
  async getSellerWallet(userId: string) {
    let wallet = await prisma.sellerWallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      wallet = await prisma.sellerWallet.create({
        data: {
          user_id: userId,
          balance: 0,
          currency: 'XOF',
        },
      });
    }

    return wallet;
  }

  /**
   * Demander un retrait — Orange Money, MTN Money, Wave
   */
  async requestWithdrawal(userId: string, data: {
    amount: number;
    orange_money_phone?: string;
    phone?: string;
    payment_method?: 'orange_money' | 'mtn_money' | 'wave' | 'paypal';
    paypal_email?: string;
    pin?: string;
  }) {
    const walletSecurity = (await import('./walletSecurity.service.js')).default;
    const check = await walletSecurity.checkCanWithdraw(userId, data.amount, { pin: data.pin });
    if (!check.allowed) {
      const err: any = new Error(check.reason);
      err.statusCode = 400;
      throw err;
    }

    // Vérifier le montant minimum
    if (data.amount < this.MIN_WITHDRAWAL_AMOUNT) {
      const error: any = new Error(`Le montant minimum de retrait est de ${this.MIN_WITHDRAWAL_AMOUNT} FCFA`);
      error.statusCode = 400;
      throw error;
    }

    // Bloquer le payout si un litige est ouvert (vendeur = userId)
    const openDispute = await prisma.dispute.findFirst({
      where: {
        seller_id: userId,
        status: { in: ['open', 'in_review'] },
      },
    });
    if (openDispute) {
      const err: any = new Error('Retrait impossible : un litige est en cours. Résolvez-le avant de demander un retrait.');
      err.statusCode = 400;
      throw err;
    }

    if (data.amount > 10_000_000) {
      const err: any = new Error('Limite mensuelle anti-blanchiment: 10 000 000 FCFA');
      err.statusCode = 400;
      throw err;
    }

    const paymentMethod = data.payment_method || 'orange_money';
    const isPayPal = paymentMethod === 'paypal';
    const paypalEmail = (data.paypal_email || '').trim().toLowerCase();
    const phone = (data.orange_money_phone || data.phone || '').replace(/\D/g, '');

    if (isPayPal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!paypalEmail || !emailRegex.test(paypalEmail)) {
        const error: any = new Error('Email PayPal requis et valide');
        error.statusCode = 400;
        throw error;
      }
    } else {
      if (!phone || phone.length < 8) {
        const error: any = new Error('Numéro de téléphone requis (Orange Money, MTN Money ou Wave)');
        error.statusCode = 400;
        throw error;
      }
      const phoneRegex = /^(77|76|70|78|69|65|66|67)\d{7,8}$/;
      if (!phoneRegex.test(phone)) {
        const error: any = new Error('Numéro invalide. Format: 77XXXXXXXX (Orange), 76XXXXXXXX (MTN), etc.');
        error.statusCode = 400;
        throw error;
      }
    }

    // Obtenir le wallet
    const wallet = await this.getSellerWallet(userId);

    const withdrawalFee = this.WITHDRAWAL_FEE_FIXED;
    const totalDeduction = data.amount + withdrawalFee;

    // Vérifier le solde (doit couvrir montant + frais)
    if (wallet.balance < totalDeduction) {
      const error: any = new Error(`Solde insuffisant. Montant requis: ${totalDeduction} FCFA (${data.amount} + ${withdrawalFee} frais)`);
      error.statusCode = 400;
      throw error;
    }

    // Bloquer le montant + frais dans le wallet (déduire immédiatement)
    await prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: totalDeduction,
        },
      },
    });

    // Créditer la plateforme (frais 500 FCFA fixe CDC)
    const platformRevenueService = (await import('./platformRevenue.service.js')).default;
    const destForLog = isPayPal ? paypalEmail : phone;
    await platformRevenueService.addRevenue(
      withdrawalFee,
      'withdrawal_fees',
      `Frais retrait - ${paymentMethod} ${destForLog} (${data.amount} FCFA)`,
      undefined
    );

    await walletSecurity.recordWithdrawal(userId, data.amount);

    const withdrawal = await prisma.withdrawal.create({
      data: {
        user_id: userId,
        amount: data.amount,
        currency: 'XOF',
        payment_method: paymentMethod,
        orange_money_phone: isPayPal ? null : phone,
        paypal_email: isPayPal ? paypalEmail : null,
        status: 'pending',
      },
    });

    const destLabel = isPayPal ? paypalEmail : phone;
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'withdrawal',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        description: `Demande de retrait vers ${paymentMethod} ${destLabel} (frais: ${withdrawalFee} FCFA)`,
        reference_id: withdrawal.id,
        payment_method: paymentMethod,
        phone_number: isPayPal ? null : phone,
      },
    });

    // Créer une transaction pour les frais de retrait
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'withdrawal_fee',
        amount: withdrawalFee,
        currency: 'XOF',
        status: 'completed',
        description: `Frais de retrait (500 FCFA)`,
        reference_id: withdrawal.id,
        payment_method: 'internal',
      },
    });

    // Notifier les admins (finance_admin, admin, super_admin)
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['super_admin', 'admin', 'finance_admin'] } },
        select: { id: true },
      });
      const creator = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      const creatorName = creator?.username || 'Un créateur';
      const destMsg = isPayPal ? paypalEmail : phone;
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'withdrawal_requested',
            title: 'Nouvelle demande de retrait',
            message: `${creatorName} demande un retrait de ${data.amount.toLocaleString()} FCFA vers ${paymentMethod} ${destMsg}. Traitement sous 24-48h.`,
            reference_type: 'withdrawal',
            reference_id: withdrawal.id,
          },
        });
      }
    } catch (notifErr) {
      logger.warn('Notification admin retrait', { err: (notifErr as Error).message });
    }

    logger.info('Demande de retrait créée', {
      withdrawalId: withdrawal.id,
      userId,
      amount: data.amount,
      payment_method: paymentMethod,
      ...(isPayPal ? { paypal_email: paypalEmail } : { phone }),
    });

    return withdrawal;
  }

  /**
   * Traiter un retrait (Admin seulement)
   * Transfère l'argent depuis le compte Orange Money de la plateforme vers le créateur
   */
  async processWithdrawal(withdrawalId: string, adminId: string, data?: {
    transaction_reference?: string;
    notes?: string;
  }) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      const error: any = new Error('Retrait non trouvé');
      error.statusCode = 404;
      throw error;
    }

    if (withdrawal.status !== 'pending') {
      const error: any = new Error(`Ce retrait est déjà ${withdrawal.status}`);
      error.statusCode = 400;
      throw error;
    }

    const minProcessDate = new Date(withdrawal.created_at);
    minProcessDate.setHours(minProcessDate.getHours() + this.WITHDRAWAL_DELAY_HOURS);
    if (new Date() < minProcessDate) {
      const err: any = new Error(`Le retrait ne peut être traité qu'à partir du ${minProcessDate.toLocaleDateString('fr-FR')} (délai ${this.WITHDRAWAL_DELAY_HOURS}h CDC)`);
      err.statusCode = 400;
      throw err;
    }

    // Mettre à jour le statut à "processing"
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'processing',
        processed_by: adminId,
        processed_at: new Date(),
        transaction_reference: data?.transaction_reference,
        admin_notes: data?.notes,
      },
    });

    try {
      let transferResult: { reference?: string };
      if (withdrawal.payment_method === 'paypal') {
        transferResult = await this.transferToPayPal(
          withdrawal.paypal_email!,
          withdrawal.amount,
          `Retrait AfriWonder - ${withdrawal.id}`
        );
      } else {
        transferResult = await this.transferToOrangeMoney(
          withdrawal.orange_money_phone!,
          withdrawal.amount,
          `Retrait AfriWonder - ${withdrawal.id}`
        );
      }

      // Si le transfert réussit, marquer comme complété
      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          transaction_reference: transferResult.reference || data?.transaction_reference,
        },
      });

      // Mettre à jour la transaction
      await prisma.transaction.updateMany({
        where: {
          reference_id: withdrawalId,
          type: 'withdrawal',
        },
        data: {
          status: 'completed',
        },
      });

      const destLabel = withdrawal.payment_method === 'paypal'
        ? withdrawal.paypal_email
        : withdrawal.orange_money_phone;
      await prisma.notification.create({
        data: {
          user_id: withdrawal.user_id,
          type: 'withdrawal_completed',
          title: 'Retrait complété ✅',
          message: `Votre retrait de ${withdrawal.amount} FCFA a été transféré vers ${destLabel}`,
          reference_id: withdrawalId,
          reference_type: 'withdrawal',
        },
      });

      logger.info('Retrait complété avec succès', {
        withdrawalId,
        userId: withdrawal.user_id,
        amount: withdrawal.amount,
        phone: withdrawal.orange_money_phone,
      });

      return {
        success: true,
        withdrawal,
        transferReference: transferResult.reference,
      };
    } catch (error: any) {
      // En cas d'erreur, rembourser le wallet (montant + frais) et marquer comme failed
      const wallet = await this.getSellerWallet(withdrawal.user_id);
      const withdrawalFee = this.WITHDRAWAL_FEE_FIXED;
      const totalRefund = withdrawal.amount + withdrawalFee;
      
      await prisma.sellerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: totalRefund,
          },
        },
      });

      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'failed',
          admin_notes: `Erreur: ${error.message}`,
        },
      });

      throw error;
    }
  }

  /**
   * Transférer de l'argent vers un compte Orange Money
   * Cette fonction utilise l'API Orange Money pour transférer depuis votre compte marchand
   */
  private async transferToOrangeMoney(phoneNumber: string, amount: number, description: string) {
    const merchantId = process.env.ORANGE_MONEY_MERCHANT_ID || process.env.VITE_ORANGE_MERCHANT_ID;
    const apiKey = process.env.ORANGE_MONEY_API_KEY || process.env.VITE_ORANGE_API_KEY;
    const transferApiKey = process.env.ORANGE_MONEY_TRANSFER_API_KEY || apiKey;

    if (!merchantId || !transferApiKey) {
      throw new Error('Orange Money non configuré pour les transferts');
    }

    const orangeMoneyBaseUrl = process.env.ORANGE_MONEY_API_URL || 'https://api.orange.ml';

    try {
      // Appeler l'API Orange Money pour transférer
      // Note: L'endpoint exact dépend de la documentation Orange Money Mali
      const response = await axios.post(
        `${orangeMoneyBaseUrl}/payment/v1/transfer`,
        {
          merchant_id: merchantId,
          merchant_key: transferApiKey,
          recipient_phone: phoneNumber,
          amount: amount,
          currency: 'XOF',
          description: description,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${transferApiKey}`,
          },
        }
      );

      return {
        success: true,
        reference: response.data.transaction_id || response.data.reference,
        message: 'Transfert initié avec succès',
      };
    } catch (error: any) {
      logger.error('Erreur lors du transfert Orange Money', {
        error: error.message,
        phoneNumber,
        amount,
      });
      throw new Error(`Erreur transfert Orange Money: ${error.message || 'Transfert échoué'}`);
    }
  }

  private async transferToPayPal(email: string, amount: number, description: string) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !secret) {
      throw new Error('PayPal non configuré (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)');
    }
    try {
      const response = await axios.post(
        `${process.env.PAYPAL_API_URL || 'https://api-m.paypal.com'}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
          },
        }
      );
      const accessToken = response.data.access_token;
      const payoutAmount = Math.round((amount / 655.957) * 100) / 100;
      const payoutRes = await axios.post(
        `${process.env.PAYPAL_API_URL || 'https://api-m.paypal.com'}/v1/payments/payouts`,
        {
          sender_batch_header: {
            sender_batch_id: `afw_${Date.now()}`,
            email_subject: 'Retrait AfriWonder',
          },
          items: [{
            recipient_type: 'EMAIL',
            amount: { value: payoutAmount.toString(), currency: 'USD' },
            receiver: email,
            note: description,
          }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return {
        success: true,
        reference: payoutRes.data?.batch_header?.payout_batch_id,
        message: 'Paiement PayPal initié',
      };
    } catch (error: any) {
      logger.error('Erreur transfert PayPal', { error: error.message, email, amount });
      throw new Error(`Erreur transfert PayPal: ${error.response?.data?.message || error.message || 'Transfert échoué'}`);
    }
  }

  /**
   * Obtenir les retraits d'un utilisateur
   */
  async getUserWithdrawals(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where: { user_id: userId } }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir tous les retraits en attente (Admin)
   */
  async getPendingWithdrawals(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { status: 'pending' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where: { status: 'pending' } }),
    ]);

    return {
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Annuler un retrait (Admin ou utilisateur)
   */
  async cancelWithdrawal(withdrawalId: string, userId: string, isAdmin: boolean = false) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      const error: any = new Error('Retrait non trouvé');
      error.statusCode = 404;
      throw error;
    }

    // Vérifier les permissions
    if (!isAdmin && withdrawal.user_id !== userId) {
      const error: any = new Error('Non autorisé');
      error.statusCode = 403;
      throw error;
    }

    if (withdrawal.status !== 'pending') {
      const error: any = new Error('Seuls les retraits en attente peuvent être annulés');
      error.statusCode = 400;
      throw error;
    }

    // Rembourser le wallet (montant + frais)
    const wallet = await this.getSellerWallet(withdrawal.user_id);
    const withdrawalFee = this.WITHDRAWAL_FEE_FIXED;
    const totalRefund = withdrawal.amount + withdrawalFee;
    
    await prisma.sellerWallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: totalRefund,
        },
      },
    });

    // Marquer comme annulé
    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'cancelled',
      },
    });

    // Mettre à jour la transaction
    await prisma.transaction.updateMany({
      where: {
        reference_id: withdrawalId,
        type: 'withdrawal',
      },
      data: {
        status: 'cancelled',
      },
    });

    logger.info('Retrait annulé', { withdrawalId, userId });

    return withdrawal;
  }
}

export const withdrawalService = new WithdrawalService();
export default withdrawalService;

