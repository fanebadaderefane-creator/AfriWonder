import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import withdrawalService from './withdrawal.service.js';

class RefundService {
  async requestRefund(orderId: string, userId: string, data: { amount: number; reason?: string }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { seller_id: true } },
          },
        },
      },
    });
    if (!order) {
      const err: any = new Error('Commande non trouvée');
      err.statusCode = 404;
      throw err;
    }
    if (order.user_id !== userId) {
      const err: any = new Error('Non autorisé');
      err.statusCode = 403;
      throw err;
    }
    if (!['pending', 'processing', 'completed'].includes(order.status)) {
      const err: any = new Error('Cette commande ne peut pas être remboursée');
      err.statusCode = 400;
      throw err;
    }
    if (data.amount <= 0 || data.amount > order.total_amount) {
      const err: any = new Error('Montant de remboursement invalide');
      err.statusCode = 400;
      throw err;
    }
    const existing = await prisma.refund.findFirst({
      where: { order_id: orderId, status: { in: ['pending', 'approved'] } },
    });
    if (existing) {
      const err: any = new Error('Un remboursement est déjà en cours pour cette commande');
      err.statusCode = 400;
      throw err;
    }
    const refund = await prisma.refund.create({
      data: {
        order_id: orderId,
        amount: data.amount,
        reason: data.reason,
        status: 'pending',
        requested_by: userId,
      },
      include: { order: true },
    });
    logger.info('Remboursement demandé', { refundId: refund.id, orderId, userId });
    return refund;
  }

  async listByUser(userId: string) {
    const orders = await prisma.order.findMany({
      where: { user_id: userId },
      select: { id: true },
    });
    const orderIds = orders.map((o) => o.id);
    return prisma.refund.findMany({
      where: { order_id: { in: orderIds } },
      include: { order: { select: { id: true, total_amount: true, status: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async processRefund(refundId: string, adminId: string, approve: boolean) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: { select: { seller_id: true } },
              },
            },
          },
        },
      },
    });
    if (!refund) {
      const err: any = new Error('Remboursement non trouvé');
      err.statusCode = 404;
      throw err;
    }
    if (refund.status !== 'pending') {
      const err: any = new Error('Ce remboursement a déjà été traité');
      err.statusCode = 400;
      throw err;
    }
    if (approve) {
      const order = refund.order;
      const sellerAmounts: Record<string, number> = {};
      for (const item of order.items) {
        const key = item.product.seller_id;
        const itemTotal = item.unit_price * item.quantity;
        const ratio = refund.amount / order.total_amount;
        const refundPart = itemTotal * ratio;
        const platformFee = refundPart * 0.1;
        const sellerRefund = refundPart - platformFee;
        sellerAmounts[key] = (sellerAmounts[key] || 0) + sellerRefund;
      }
      for (const [sellerId, amount] of Object.entries(sellerAmounts)) {
        if (amount <= 0) continue;
        const wallet = await withdrawalService.getSellerWallet(sellerId);
        await prisma.sellerWallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: amount } },
        });
      }
      await prisma.transaction.create({
        data: {
          user_id: refund.requested_by,
          type: 'refund',
          amount: refund.amount,
          currency: 'XOF',
          status: 'completed',
          description: `Remboursement commande ${order.id}`,
          reference_id: refund.id,
          payment_method: 'internal',
        },
      });
      await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'completed',
          processed_by: adminId,
          processed_at: new Date(),
        },
      });
      const newOrderTotal = order.total_amount - refund.amount;
      if (newOrderTotal <= 0) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'refunded' },
        });
      }
    } else {
      await prisma.refund.update({
        where: { id: refundId },
        data: {
          status: 'rejected',
          processed_by: adminId,
          processed_at: new Date(),
        },
      });
    }
    return prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });
  }

  async listAll(page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { order: { select: { id: true, user_id: true, total_amount: true } } },
      }),
      prisma.refund.count({ where }),
    ]);
    return { refunds, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}

export default new RefundService();
