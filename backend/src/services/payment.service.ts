import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import Stripe from 'stripe';
import axios from 'axios';
import fraudCheck from './fraudCheck.service.js';
import ledgerService from './ledger.service.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null;

class PaymentService {
  // ============================================
  // STRIPE PAYMENTS
  // ============================================

  async createStripeCheckoutSession(userId: string, orderId: string, data: {
    items: Array<{ product_id: string; quantity: number; price: number; name: string }>;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (!stripe) {
      throw new Error('Stripe non configuré');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const totalAmount = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const fraud = await fraudCheck.checkPayment(userId, totalAmount, 'stripe', { orderId });
    if (!fraud.allowed) {
      throw new Error(fraud.reason || 'Paiement refusé pour des raisons de sécurité.');
    }

    const lineItems = data.items.map(item => ({
      price_data: {
        currency: 'xof',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Convertir en cents
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: user.email,
      metadata: {
        user_id: userId,
        order_id: orderId,
      },
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
    });

    // Créer une transaction
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'payment',
        amount: data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        currency: 'XOF',
        status: 'pending',
        description: `Paiement Stripe - Commande ${orderId}`,
        reference_id: orderId,
      },
    });

    logger.info('Session Stripe créée', { sessionId: session.id, userId, orderId });
    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async verifyStripePayment(sessionId: string) {
    if (!stripe) {
      throw new Error('Stripe non configuré');
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const userId = session.metadata?.user_id;
      const orderId = session.metadata?.order_id;

      if (userId && orderId) {
        // Mettre à jour la transaction
        await prisma.transaction.updateMany({
          where: {
            user_id: userId,
            reference_id: orderId,
            status: 'pending',
          },
          data: {
            status: 'completed',
          },
        });

        // Mettre à jour la commande
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'processing' },
        });

        // Mettre à jour le wallet si nécessaire (après confirmation vendeur / escrow)
        const wallet = await prisma.wallet.findFirst({
          where: { user_id: userId, wallet_type: 'user' },
        });
        if (wallet) {
          // Le wallet sera mis à jour après confirmation du vendeur
        }
      }

      return {
        success: true,
        status: 'paid',
        orderId: session.metadata?.order_id,
      };
    }

    return {
      success: true,
      status: session.payment_status,
    };
  }

  /**
   * Vérifie la signature du webhook Stripe et retourne l’événement (prod: STRIPE_WEBHOOK_SECRET requis).
   */
  verifyStripeWebhook(body: Buffer | string, signature: string): Stripe.Event {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) {
      throw new Error('Stripe webhook non configuré (STRIPE_WEBHOOK_SECRET manquant)');
    }
    return stripe.webhooks.constructEvent(body, signature, secret);
  }

  /**
   * Traite l’événement Stripe (checkout.session.completed → confirmPayment).
   */
  async handleStripeWebhookEvent(event: Stripe.Event): Promise<{ processed: boolean }> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId && session.payment_status === 'paid') {
        const orderService = (await import('./order.service.js')).default;
        await orderService.confirmPayment(orderId);
        logger.info('Stripe webhook: commande confirmée', { orderId });
        return { processed: true };
      }
    }
    return { processed: false };
  }

  // ============================================
  // ORANGE MONEY PAYMENTS
  // ============================================

  async initiateOrangeMoneyPayment(userId: string, orderId: string, data: {
    amount: number;
    phone: string;
    returnUrl: string;
  }) {
    // Configuration Orange Money Mali
    const merchantId = process.env.ORANGE_MONEY_MERCHANT_ID || process.env.VITE_ORANGE_MERCHANT_ID;
    const apiKey = process.env.ORANGE_MONEY_API_KEY || process.env.VITE_ORANGE_API_KEY;

    if (!merchantId || !apiKey) {
      throw new Error('Orange Money Mali non configuré. Vérifiez ORANGE_MONEY_MERCHANT_ID et ORANGE_MONEY_API_KEY');
    }

    // Pour Orange Money Mali, l'API peut varier selon la documentation officielle
    // Utiliser l'endpoint Mali spécifique
    const orangeMoneyBaseUrl = process.env.ORANGE_MONEY_API_URL || 'https://api.orange.ml';
    
    try {
      // Créer le paiement Orange Money Mali
      // Note: L'implémentation exacte dépend de l'API Orange Money Mali
      // Cette structure est un exemple et doit être adaptée selon la documentation officielle
      const paymentResponse = await axios.post(
        `${orangeMoneyBaseUrl}/payment/v1/webpayment`,
        {
          merchant_id: merchantId,
          merchant_key: apiKey,
          currency: 'XOF',
          order_id: orderId,
          amount: data.amount,
          subscriber_number: data.phone,
          return_url: data.returnUrl,
          cancel_url: data.returnUrl,
          notify_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/orange-money/webhook`,
          lang: 'fr',
          reference: orderId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`, // Ou selon la méthode d'authentification Orange Money Mali
          },
        }
      );

    // Créer une transaction
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'payment',
        amount: data.amount,
        currency: 'XOF',
        status: 'pending',
        description: `Paiement Orange Money - Commande ${orderId}`,
        reference_id: orderId,
      },
    });

      logger.info('Paiement Orange Money Mali initié', { userId, orderId, amount: data.amount });
      return {
        paymentUrl: paymentResponse.data.payment_url || paymentResponse.data.redirect_url,
        orderId,
        reference: paymentResponse.data.reference || orderId,
      };
    } catch (error: any) {
      logger.error('Erreur lors de l\'initiation du paiement Orange Money Mali', {
        error: error.message,
        userId,
        orderId,
      });
      throw new Error(`Erreur Orange Money Mali: ${error.message || 'Impossible d\'initier le paiement'}`);
    }
  }

  async verifyOrangeMoneyPayment(orderId: string, data: {
    status: string;
    pay_token?: string;
  }) {
    if (data.status === 'SUCCESS' && data.pay_token) {
      // Vérifier le paiement avec Orange Money API
      const clientId = process.env.ORANGE_MONEY_CLIENT_ID;
      const clientSecret = process.env.ORANGE_MONEY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error('Orange Money non configuré');
      }

      // Obtenir le token
      const tokenResponse = await axios.post(
        'https://api.orange.com/oauth/v3/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const accessToken = tokenResponse.data.access_token;

      // Vérifier le statut du paiement
      try {
        const verifyResponse = await axios.get(
          `https://api.orange.com/orange-money-webpay/m/v1/transactionstatus?order_id=${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (verifyResponse.data.status === 'SUCCESS') {
          // Mettre à jour la transaction
          await prisma.transaction.updateMany({
            where: {
              reference_id: orderId,
              status: 'pending',
            },
            data: {
              status: 'completed',
            },
          });

          // Mettre à jour la commande
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'processing' },
          });

          return {
            success: true,
            status: 'paid',
            orderId,
          };
        }
      } catch (error) {
        logger.error('Erreur vérification Orange Money', error);
      }
    }

    return {
      success: false,
      status: data.status,
    };
  }

  // ============================================
  // MTN MOBILE MONEY (stub — configurer MTN_MOBILE_MONEY_* en prod)
  // ============================================
  async initiateMtnMoneyPayment(userId: string, orderId: string, data: { amount: number; phone: string; returnUrl: string }) {
    if (!process.env.MTN_MOBILE_MONEY_API_KEY || !process.env.MTN_MOBILE_MONEY_SUBSCRIPTION_KEY) {
      throw new Error('MTN Mobile Money non configuré. Vérifiez MTN_MOBILE_MONEY_API_KEY et MTN_MOBILE_MONEY_SUBSCRIPTION_KEY');
    }
    // Stub: en prod, appeler l'API MTN MoMo (ex: collection/v1_0/requesttopay)
    logger.info('Paiement MTN MoMo initié (stub)', { userId, orderId, amount: data.amount });
    return { orderId, reference: orderId, paymentUrl: data.returnUrl, provider: 'mtn_money' };
  }

  async verifyMtnMoneyPayment(orderId: string, data: { status: string; transaction_id?: string }) {
    if (data.status === 'SUCCESS' && data.transaction_id) {
      logger.info('Paiement MTN MoMo vérifié (stub)', { orderId });
      return { success: true, status: 'paid', orderId };
    }
    return { success: false, status: data.status };
  }

  // ============================================
  // WAVE (stub — configurer WAVE_* en prod)
  // ============================================
  async initiateWavePayment(userId: string, orderId: string, data: { amount: number; currency?: string; returnUrl: string }) {
    if (!process.env.WAVE_API_KEY) {
      throw new Error('Wave non configuré. Vérifiez WAVE_API_KEY');
    }
    logger.info('Paiement Wave initié (stub)', { userId, orderId, amount: data.amount });
    return { orderId, reference: orderId, paymentUrl: data.returnUrl, provider: 'wave' };
  }

  async verifyWavePayment(orderId: string, data: { status?: string }) {
    if (data.status === 'success' || data.status === 'completed') {
      logger.info('Paiement Wave vérifié (stub)', { orderId });
      return { success: true, status: 'paid', orderId };
    }
    return { success: false, status: data.status };
  }

  // ============================================
  // FLUTTERWAVE (stub — configurer FLUTTERWAVE_* en prod)
  // ============================================
  async initiateFlutterwavePayment(userId: string, orderId: string, data: { amount: number; email: string; returnUrl: string; currency?: string }) {
    if (!process.env.FLUTTERWAVE_SECRET_KEY) {
      throw new Error('Flutterwave non configuré. Vérifiez FLUTTERWAVE_SECRET_KEY');
    }
    logger.info('Paiement Flutterwave initié (stub)', { userId, orderId, amount: data.amount });
    return { orderId, reference: orderId, paymentUrl: data.returnUrl, provider: 'flutterwave' };
  }

  async verifyFlutterwavePayment(orderId: string, data: { status?: string; tx_id?: string }) {
    if (data.status === 'successful' || data.status === 'success') {
      logger.info('Paiement Flutterwave vérifié (stub)', { orderId });
      return { success: true, status: 'paid', orderId };
    }
    return { success: false, status: data.status };
  }

  // ============================================
  // PAYSTACK (stub — configurer PAYSTACK_* en prod)
  // ============================================
  async initiatePaystackPayment(userId: string, orderId: string, data: { amount: number; email: string; returnUrl?: string }) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack non configuré. Vérifiez PAYSTACK_SECRET_KEY');
    }
    logger.info('Paiement Paystack initié (stub)', { userId, orderId, amount: data.amount });
    return { orderId, reference: orderId, paymentUrl: data.returnUrl || '', provider: 'paystack' };
  }

  async verifyPaystackPayment(orderId: string, data: { reference?: string; status?: string }) {
    if (data.status === 'success' || data.reference) {
      logger.info('Paiement Paystack vérifié (stub)', { orderId });
      return { success: true, status: 'paid', orderId };
    }
    return { success: false, status: data.status };
  }

  /**
   * Retry paiement : incrémente retry_count sur OrderPayment et retourne les infos pour relancer.
   */
  async recordPaymentRetry(orderId: string, provider: string, failureReason?: string) {
    const lastPayment = await prisma.orderPayment.findFirst({
      where: { order_id: orderId, provider },
      orderBy: { created_at: 'desc' },
    });
    if (lastPayment) {
      await prisma.orderPayment.update({
        where: { id: lastPayment.id },
        data: {
          retry_count: { increment: 1 },
          failure_reason: failureReason ?? undefined,
        },
      });
    }
    return { orderId, provider, retry_count: (lastPayment?.retry_count ?? 0) + 1 };
  }

  // ============================================
  // WALLET OPERATIONS (via Ledger — double écriture)
  // ============================================

  async getWallet(userId: string) {
    return await ledgerService.getOrCreateUserWallet(userId, 'XOF');
  }

  /**
   * Obtenir le wallet vendeur (pour les créateurs)
   * Utilisé pour les tips, gifts, etc.
   */
  async getSellerWallet(userId: string) {
    const withdrawalService = (await import('./withdrawal.service.js')).default;
    return await withdrawalService.getSellerWallet(userId);
  }

  async addToWallet(userId: string, amount: number, description?: string) {
    const wallet = await this.getWallet(userId);
    const updated = await ledgerService.credit(wallet.id, amount, {
      referenceType: 'deposit',
      description: description || 'Dépôt dans le portefeuille',
    });
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'deposit',
        amount,
        currency: 'XOF',
        status: 'completed',
        description: description || 'Dépôt dans le portefeuille',
      },
    });
    return updated;
  }

  async withdrawFromWallet(userId: string, amount: number, description?: string, options?: { pin?: string }) {
    const walletSecurity = (await import('./walletSecurity.service.js')).default;
    const check = await walletSecurity.checkCanWithdraw(userId, amount, { pin: options?.pin });
    if (!check.allowed) throw new Error(check.reason);
    const wallet = await this.getWallet(userId);
    const available = (wallet as any).available_balance ?? wallet.balance;
    if (available < amount) throw new Error('Solde insuffisant');
    const updated = await ledgerService.debit(wallet.id, amount, {
      referenceType: 'withdrawal',
      description: description || 'Retrait du portefeuille',
    });
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'withdrawal',
        amount,
        currency: 'XOF',
        status: 'completed',
        description: description || 'Retrait du portefeuille',
      },
    });
    await walletSecurity.recordWithdrawal(userId, amount);
    return updated;
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where: { user_id: userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;

