import prisma from '../config/database.js';
import { isAdminRole } from '../middleware/adminRbac.js';
import notificationService from './notification.service.js';
import { logger } from '../utils/logger.js';

type ReturnCreateInput = {
  reason: string;
  description?: string;
  refund_amount: number;
};

type ReturnStatusUpdateInput = {
  status: string;
  return_tracking_number?: string;
};

class ReturnService {
  private toHttpError(message: string, statusCode: number) {
    const error = new Error(message) as Error & { statusCode?: number };
    error.statusCode = statusCode;
    return error;
  }

  private normalizeText(value?: string) {
    return typeof value === 'string' ? value.trim() : '';
  }

  async createReturn(orderId: string, buyerId: string, input: ReturnCreateInput) {
    const reason = this.normalizeText(input.reason);
    if (!reason) {
      throw this.toHttpError('reason requis', 400);
    }
    if (!Number.isFinite(input.refund_amount) || input.refund_amount <= 0) {
      throw this.toHttpError('refund_amount invalide', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        user_id: true,
        seller_id: true,
        total_amount: true,
        status: true,
      },
    });

    if (!order) {
      throw this.toHttpError('Commande non trouvee', 404);
    }
    if (order.user_id !== buyerId) {
      throw this.toHttpError('Non autorise', 403);
    }
    if (!['delivered', 'completed'].includes(order.status)) {
      throw this.toHttpError('Retour/echange autorise uniquement apres livraison', 400);
    }
    if (input.refund_amount > order.total_amount) {
      throw this.toHttpError('refund_amount depasse le total de la commande', 400);
    }

    const existing = await prisma.return.findFirst({
      where: {
        order_id: orderId,
        user_id: buyerId,
        status: { in: ['pending', 'approved', 'exchange_approved', 'exchange_in_progress'] },
      },
      select: { id: true },
    });
    if (existing) {
      throw this.toHttpError('Un retour/echange actif existe deja pour cette commande', 409);
    }

    const created = await prisma.return.create({
      data: {
        order_id: orderId,
        user_id: buyerId,
        reason,
        description: this.normalizeText(input.description) || null,
        refund_amount: input.refund_amount,
        status: 'pending',
      },
    });

    try {
      await notificationService.notifyReturnUpdate(buyerId, created.id, orderId, 'pending', 'buyer');
      if (order.seller_id) {
        await notificationService.notifyReturnUpdate(order.seller_id, created.id, orderId, 'pending', 'seller');
      }
    } catch (err) {
      logger.warn('Erreur notification creation retour/echange', { orderId, returnId: created.id, err });
    }

    return created;
  }

  async listReturns(
    actorId: string,
    actorRole: string,
    scope: 'buyer' | 'seller' | 'admin',
  ) {
    if (scope === 'admin') {
      if (!isAdminRole(actorRole)) {
        throw this.toHttpError('Acces admin requis', 403);
      }
      return prisma.return.findMany({ orderBy: { created_at: 'desc' } });
    }

    if (scope === 'seller') {
      const sellerOrders = await prisma.order.findMany({
        where: { seller_id: actorId },
        select: { id: true },
      });
      const orderIds = sellerOrders.map((o) => o.id);
      if (orderIds.length === 0) {
        return [];
      }
      return prisma.return.findMany({
        where: { order_id: { in: orderIds } },
        orderBy: { created_at: 'desc' },
      });
    }

    return prisma.return.findMany({
      where: { user_id: actorId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getReturnById(returnId: string, actorId: string, actorRole: string) {
    const entry = await prisma.return.findUnique({ where: { id: returnId } });
    if (!entry) {
      throw this.toHttpError('Retour/echange non trouve', 404);
    }

    if (entry.user_id === actorId || isAdminRole(actorRole)) {
      return entry;
    }

    const order = await prisma.order.findUnique({
      where: { id: entry.order_id },
      select: { seller_id: true },
    });
    if (!order) {
      throw this.toHttpError('Commande associee introuvable', 404);
    }
    if (order.seller_id !== actorId) {
      throw this.toHttpError('Non autorise', 403);
    }

    return entry;
  }

  async updateReturnStatus(
    returnId: string,
    actorId: string,
    actorRole: string,
    input: ReturnStatusUpdateInput,
  ) {
    const nextStatus = this.normalizeText(input.status);
    if (!nextStatus) {
      throw this.toHttpError('status requis', 400);
    }

    const entry = await prisma.return.findUnique({ where: { id: returnId } });
    if (!entry) {
      throw this.toHttpError('Retour/echange non trouve', 404);
    }

    const order = await prisma.order.findUnique({
      where: { id: entry.order_id },
      select: { seller_id: true },
    });
    if (!order) {
      throw this.toHttpError('Commande associee introuvable', 404);
    }

    const isAdmin = isAdminRole(actorRole);
    const isSeller = order.seller_id === actorId;
    if (!isAdmin && !isSeller) {
      throw this.toHttpError('Non autorise', 403);
    }

    const data: {
      status: string;
      return_tracking_number?: string | null;
      approved_at?: Date;
      processed_at?: Date;
    } = { status: nextStatus };

    if (typeof input.return_tracking_number === 'string') {
      const tracking = input.return_tracking_number.trim();
      data.return_tracking_number = tracking || null;
    }

    if (['approved', 'exchange_approved'].includes(nextStatus) && !entry.approved_at) {
      data.approved_at = new Date();
    }
    if (['processed', 'completed', 'rejected', 'exchange_completed'].includes(nextStatus)) {
      data.processed_at = new Date();
    }

    return prisma.return.update({
      where: { id: returnId },
      data,
    }).then(async (updated) => {
      try {
        await notificationService.notifyReturnUpdate(entry.user_id, updated.id, updated.order_id, updated.status, 'buyer');
        if (order.seller_id) {
          await notificationService.notifyReturnUpdate(order.seller_id, updated.id, updated.order_id, updated.status, 'seller');
        }
      } catch (err) {
        logger.warn('Erreur notification update retour/echange', { returnId: updated.id, status: updated.status, err });
      }
      return updated;
    });
  }
}

export const returnService = new ReturnService();
export default returnService;
