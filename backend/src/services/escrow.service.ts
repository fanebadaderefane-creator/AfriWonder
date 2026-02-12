/**
 * Service Escrow — protection acheteur (blocage/déblocage des fonds)
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import notificationService from './notification.service.js';
import ledgerService from './ledger.service.js';

class EscrowService {
  private readonly DEFAULT_RELEASE_DAYS = 7;
  private readonly PLATFORM_COMMISSION_RATE = 0.1;

  async holdFunds(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { seller: true },
            },
          },
        },
      },
    });

    if (!order) throw new Error('Commande non trouvée');
    if (order.escrow_status != null && order.escrow_status !== 'pending') {
      throw new Error('Fonds déjà traités');
    }

    const sellerAmounts: Record<string, { amount: number; platformFee: number }> = {};

    for (const item of order.items) {
      const sellerId = item.product.seller_id;
      const itemTotal = (item as any).unit_price ? (item as any).unit_price * item.quantity : (item as any).price * item.quantity;
      const platformFee = itemTotal * this.PLATFORM_COMMISSION_RATE;
      const sellerEarnings = itemTotal - platformFee;

      if (!sellerAmounts[sellerId]) sellerAmounts[sellerId] = { amount: 0, platformFee: 0 };
      sellerAmounts[sellerId].amount += sellerEarnings;
      sellerAmounts[sellerId].platformFee += platformFee;

      await platformRevenueService.addRevenue(
        platformFee,
        'marketplace',
        `Commission - Commande ${orderId}`,
        `${orderId}-${item.id}`
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { escrow_status: 'held', payment_status: 'escrow' },
    });

    logger.info('Fonds bloqués dans escrow', { orderId });
    return { orderId, sellerAmounts };
  }

  async releaseFunds(orderId: string, reason: 'delivery_confirmed' | 'auto_release' | 'dispute_resolved') {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { seller: true } },
          },
        },
      },
    });

    if (!order) throw new Error('Commande non trouvée');
    if (order.escrow_status !== 'held') throw new Error('Fonds non bloqués');

    const activeDispute = await prisma.dispute.findFirst({
      where: { order_id: orderId, status: { in: ['open', 'investigating'] } },
    });
    if (activeDispute && reason !== 'dispute_resolved') {
      throw new Error('Impossible de débloquer : litige en cours');
    }

    const sellerAmounts: Record<string, number> = {};
    for (const item of order.items) {
      const sellerId = item.product.seller_id;
      const itemTotal = (item as any).unit_price ? (item as any).unit_price * item.quantity : (item as any).price * item.quantity;
      const platformFee = itemTotal * this.PLATFORM_COMMISSION_RATE;
      if (!sellerAmounts[sellerId]) sellerAmounts[sellerId] = 0;
      sellerAmounts[sellerId] += itemTotal - platformFee;
    }

    for (const [sellerId, amount] of Object.entries(sellerAmounts)) {
      const wallet = await withdrawalService.getSellerWallet(sellerId);
      await prisma.sellerWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      await prisma.transaction.create({
        data: {
          user_id: sellerId,
          type: 'order_payment',
          amount,
          currency: order.currency || 'XOF',
          status: 'completed',
          description: `Vente - Commande ${orderId}`,
          reference_id: orderId,
          payment_method: 'internal',
        },
      });
      try {
        await notificationService.notifyPaymentReceived(sellerId, orderId, amount);
      } catch (e) {
        logger.warn('Notification payout', { orderId, sellerId });
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { escrow_status: 'released', payment_status: 'released' },
    });
    logger.info('Fonds escrow débloqués', { orderId, reason });
    return { orderId, sellerAmounts, reason };
  }

  async refundFunds(orderId: string, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new Error('Commande non trouvée');
    if (order.escrow_status !== 'held') throw new Error('Fonds non bloqués');

    const userWallet = await ledgerService.getOrCreateUserWallet(order.user_id, order.currency || 'XOF');
    await ledgerService.credit(userWallet.id, order.total_amount, {
      referenceId: orderId,
      referenceType: 'refund',
      description: `Remboursement - ${reason}`,
    });
    await prisma.transaction.create({
      data: {
        user_id: order.user_id,
        type: 'refund',
        amount: order.total_amount,
        currency: order.currency || 'XOF',
        status: 'completed',
        description: `Remboursement - ${reason}`,
        reference_id: orderId,
        payment_method: 'internal',
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { escrow_status: 'refunded', payment_status: 'refunded', status: 'refunded' },
    });
    try {
      await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'refunded');
    } catch (e) {
      logger.warn('Notification refund', { orderId });
    }
    return { orderId, refundedAmount: order.total_amount };
  }

  async freezeFundsForDispute(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Commande non trouvée');
    if (order.escrow_status !== 'held') return { orderId, status: 'frozen' };
    await prisma.order.update({
      where: { id: orderId },
      data: { dispute_status: 'open' },
    });
    return { orderId, status: 'frozen' };
  }

  async partialRefundAndRelease(orderId: string, refundAmount: number, reason: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { include: { seller: true } },
          },
        },
      },
    });

    if (!order) throw new Error('Commande non trouvée');
    if (order.escrow_status !== 'held') throw new Error('Fonds non bloqués');

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      const err: any = new Error('refund_amount invalide');
      err.statusCode = 400;
      throw err;
    }
    if (refundAmount >= order.total_amount) {
      const err: any = new Error('refund_amount doit être inférieur au total de la commande');
      err.statusCode = 400;
      throw err;
    }

    const sellerRaw: Record<string, number> = {};
    for (const item of order.items) {
      const sellerId = item.product.seller_id;
      const itemTotal = (item as any).unit_price
        ? (item as any).unit_price * item.quantity
        : (item as any).price * item.quantity;
      const platformFee = itemTotal * this.PLATFORM_COMMISSION_RATE;
      if (!sellerRaw[sellerId]) sellerRaw[sellerId] = 0;
      sellerRaw[sellerId] += itemTotal - platformFee;
    }

    const sellerTotal = Object.values(sellerRaw).reduce((s, v) => s + v, 0);
    if (refundAmount >= sellerTotal) {
      const err: any = new Error('refund_amount trop élevé par rapport au montant libérable vendeur');
      err.statusCode = 400;
      throw err;
    }

    const remainingForSellers = sellerTotal - refundAmount;
    const ratio = remainingForSellers / sellerTotal;
    const sellerIds = Object.keys(sellerRaw);
    const sellerPayouts: Record<string, number> = {};
    let distributed = 0;

    for (let i = 0; i < sellerIds.length; i++) {
      const sellerId = sellerIds[i];
      const base = sellerRaw[sellerId];
      const payout = i === sellerIds.length - 1
        ? Math.max(0, Number((remainingForSellers - distributed).toFixed(2)))
        : Math.max(0, Number((base * ratio).toFixed(2)));
      sellerPayouts[sellerId] = payout;
      distributed += payout;
    }

    const userWallet = await ledgerService.getOrCreateUserWallet(order.user_id, order.currency || 'XOF');
    await ledgerService.credit(userWallet.id, refundAmount, {
      referenceId: orderId,
      referenceType: 'refund',
      description: `Remboursement partiel - ${reason}`,
    });
    await prisma.transaction.create({
      data: {
        user_id: order.user_id,
        type: 'refund',
        amount: refundAmount,
        currency: order.currency || 'XOF',
        status: 'completed',
        description: `Remboursement partiel - ${reason}`,
        reference_id: orderId,
        payment_method: 'internal',
      },
    });

    for (const [sellerId, amount] of Object.entries(sellerPayouts)) {
      if (amount <= 0) continue;
      const wallet = await withdrawalService.getSellerWallet(sellerId);
      await prisma.sellerWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });
      await prisma.transaction.create({
        data: {
          user_id: sellerId,
          type: 'order_payment',
          amount,
          currency: order.currency || 'XOF',
          status: 'completed',
          description: `Vente (partielle) - Commande ${orderId}`,
          reference_id: orderId,
          payment_method: 'internal',
        },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { escrow_status: 'released', payment_status: 'released' },
    });

    logger.info('Remboursement partiel et libération escrow', {
      orderId,
      refundAmount,
      remainingForSellers,
    });

    return { orderId, refundAmount, sellerPayouts, remainingForSellers };
  }

  async checkAndAutoRelease() {
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() - this.DEFAULT_RELEASE_DAYS);
    const orders = await prisma.order.findMany({
      where: {
        escrow_status: 'held',
        delivered_at: { not: null, lte: releaseDate },
        dispute_status: null,
      },
    });
    const results: { orderId: string; status: string }[] = [];
    for (const order of orders) {
      const active = await prisma.dispute.findFirst({
        where: { order_id: order.id, status: { in: ['open', 'investigating'] } },
      });
      if (!active) {
        try {
          await this.releaseFunds(order.id, 'auto_release');
          results.push({ orderId: order.id, status: 'released' });
        } catch (e: any) {
          results.push({ orderId: order.id, status: e.message || 'error' });
        }
      }
    }
    return results;
  }
}

export const escrowService = new EscrowService();
export default escrowService;
