import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import escrowService from './escrow.service.js';
import notificationService from './notification.service.js';

const VALID_STATUSES = ['open', 'in_review', 'investigating', 'resolved', 'closed', 'rejected'];
const VALID_RESOLUTIONS = ['refund_buyer', 'favor_seller', 'partial_refund', 'cancelled', 'other'];

class DisputeService {
  async createDispute(orderId: string, reporterId: string, data: { reason: string; description?: string; evidence_images?: string[] }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: { select: { seller_id: true } } } } },
    });
    if (!order) throw new Error('Commande non trouvée');
    const sellerId = order.items[0]?.product?.seller_id;
    if (!sellerId) throw new Error('Commande invalide');
    if (order.user_id !== reporterId && sellerId !== reporterId) throw new Error('Non autorisé');
    const existing = await prisma.dispute.findFirst({
      where: { order_id: orderId, status: { in: ['open', 'investigating'] } },
    });
    if (existing) throw new Error('Un litige est déjà ouvert pour cette commande');
    const dispute = await prisma.dispute.create({
      data: {
        order_id: orderId,
        user_id: order.user_id,
        seller_id: sellerId,
        reason: data.reason,
        description: data.description,
        evidence_images: data.evidence_images || [],
        status: 'open',
      },
    });
    try {
      await escrowService.freezeFundsForDispute(orderId);
    } catch (e) {
      logger.warn('Escrow freeze', { orderId });
    }
    await prisma.order.update({ where: { id: orderId }, data: { dispute_status: 'open' } });
    const otherId = reporterId === order.user_id ? sellerId : order.user_id;
    try {
      await notificationService.create(otherId, {
        type: 'dispute_opened',
        title: 'Litige ouvert',
        message: `Litige ouvert pour la commande ${orderId}`,
        reference_id: orderId,
        reference_type: 'order',
      });
    } catch (e) {
      logger.warn('Notification dispute', { orderId });
    }
    return dispute;
  }

  async addMessage(disputeId: string, userId: string, data: { message: string; attachments?: string[]; is_staff?: boolean }) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new Error('Litige non trouvé');
    if (!data.is_staff && dispute.user_id !== userId && dispute.seller_id !== userId) throw new Error('Non autorisé');
    const msg = await prisma.disputeMessage.create({
      data: {
        dispute_id: disputeId,
        user_id: userId,
        message: data.message,
        attachments: data.attachments || [],
        is_staff: data.is_staff || false,
      },
    });
    const otherId = userId === dispute.user_id ? dispute.seller_id : dispute.user_id;
    try {
      await notificationService.create(otherId, {
        type: 'dispute_message',
        title: 'Nouveau message litige',
        message: `Nouveau message pour le litige de la commande ${dispute.order_id}`,
        reference_id: disputeId,
        reference_type: 'dispute',
      });
    } catch (e) {
      logger.warn('Notification message dispute', { disputeId });
    }
    return msg;
  }

  async resolveDispute(disputeId: string, adminId: string, data: { resolution_type: 'refund' | 'partial_refund' | 'reject'; resolution: string; refund_amount?: number }) {
    const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { order: true } });
    if (!dispute) throw new Error('Litige non trouvé');
    if (dispute.status !== 'open' && dispute.status !== 'investigating') throw new Error('Litige déjà résolu');
    await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution_type: data.resolution_type,
        resolution: data.resolution,
        resolved_by: adminId,
        resolved_at: new Date(),
      },
    });
    await prisma.order.update({ where: { id: dispute.order_id }, data: { dispute_status: 'resolved' } });
    if (data.resolution_type === 'refund') {
      await escrowService.refundFunds(dispute.order_id, data.resolution);
    } else if (data.resolution_type === 'partial_refund') {
      const amount = Number(data.refund_amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount >= Number(dispute.order.total_amount)) {
        const err: any = new Error('refund_amount invalide pour partial_refund');
        err.statusCode = 400;
        throw err;
      }
      await escrowService.partialRefundAndRelease(dispute.order_id, amount, data.resolution);
    } else if (data.resolution_type === 'reject') {
      await escrowService.releaseFunds(dispute.order_id, 'dispute_resolved');
    }
    try {
      await notificationService.notifyDisputeResolved(dispute.user_id, disputeId, dispute.order_id, data.resolution, false);
      await notificationService.notifyDisputeResolved(dispute.seller_id, disputeId, dispute.order_id, data.resolution, true);
    } catch (e) {
      logger.warn('Notification resolve', { disputeId });
    }
    return { disputeId, resolution: data.resolution_type };
  }

  async getDispute(disputeId: string, userId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: { include: { items: { include: { product: { select: { id: true, name: true, images: true } } } } } },
        messages: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!dispute) throw new Error('Litige non trouvé');
    if (dispute.user_id !== userId && dispute.seller_id !== userId) throw new Error('Non autorisé');
    return dispute;
  }

  async listDisputes(userId: string, filters?: { status?: string; as?: 'buyer' | 'seller' | 'admin' }) {
    const where: any = {};
    if (filters?.as === 'buyer') where.user_id = userId;
    else if (filters?.as === 'seller') where.seller_id = userId;
    if (filters?.status) where.status = filters.status;
    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        order: { select: { id: true, total_amount: true, status: true } },
        messages: { orderBy: { created_at: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    });
    return disputes;
  }

  async create(userId: string, data: {
    order_id: string;
    seller_id: string;
    reason: string;
    description?: string;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: data.order_id },
      select: { user_id: true },
    });

    if (!order) {
      const err: any = new Error('Commande non trouvée');
      err.statusCode = 404;
      throw err;
    }

    if (order.user_id !== userId) {
      const err: any = new Error('Non autorisé : vous n\'êtes pas l\'acheteur de cette commande');
      err.statusCode = 403;
      throw err;
    }

    const existing = await prisma.dispute.findFirst({
      where: { order_id: data.order_id, status: { in: ['open', 'in_review'] } },
    });

    if (existing) {
      const err: any = new Error('Un litige est déjà ouvert pour cette commande');
      err.statusCode = 400;
      throw err;
    }

    const dispute = await prisma.dispute.create({
      data: {
        order_id: data.order_id,
        user_id: userId,
        seller_id: data.seller_id,
        reason: data.reason,
        description: data.description ?? undefined,
        status: 'open',
      },
    });

    logger.info('Litige créé', { disputeId: dispute.id, orderId: data.order_id, userId });
    return dispute;
  }

  async list(userId: string, role: 'buyer' | 'seller', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where =
      role === 'seller'
        ? { seller_id: userId }
        : { user_id: userId };

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ]);

    return {
      disputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, userId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      const err: any = new Error('Litige non trouvé');
      err.statusCode = 404;
      throw err;
    }

    if (dispute.user_id !== userId && dispute.seller_id !== userId) {
      const err: any = new Error('Non autorisé');
      err.statusCode = 403;
      throw err;
    }

    return dispute;
  }

  async updateStatus(
    id: string,
    userId: string,
    data: { status?: string; resolution?: string }
  ) {
    const dispute = await prisma.dispute.findUnique({
      where: { id },
    });

    if (!dispute) {
      const err: any = new Error('Litige non trouvé');
      err.statusCode = 404;
      throw err;
    }

    if (dispute.seller_id !== userId) {
      const err: any = new Error('Seul le vendeur ou un admin peut mettre à jour le litige');
      err.statusCode = 403;
      throw err;
    }

    const updateData: any = {};
    if (data.status) {
      if (!VALID_STATUSES.includes(data.status)) {
        const err: any = new Error('Statut invalide');
        err.statusCode = 400;
        throw err;
      }
      updateData.status = data.status;
    }
    if (data.resolution !== undefined) {
      if (data.resolution && !VALID_RESOLUTIONS.includes(data.resolution)) {
        const err: any = new Error('Résolution invalide');
        err.statusCode = 400;
        throw err;
      }
      updateData.resolution = data.resolution;
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date();
      if (!updateData.status) updateData.status = 'resolved';
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: updateData,
    });

    logger.info('Litige mis à jour', { disputeId: id, status: data.status, resolution: data.resolution });
    return updated;
  }
}

export default new DisputeService();
