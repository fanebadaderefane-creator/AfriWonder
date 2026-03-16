/**
 * CPO 9.25 — Groupes d'achat
 */
import prisma from '../config/database.js';

class GroupBuyService {
  async create(productId: string, userId: string, minQuantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, seller_id: true, status: true },
    });
    if (!product) {
      const err: any = new Error('Produit introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (product.status !== 'active') {
      const err: any = new Error('Produit non disponible');
      err.statusCode = 400;
      throw err;
    }
    const q = Math.max(2, minQuantity || 2);
    return prisma.groupBuy.create({
      data: {
        product_id: productId,
        creator_id: userId,
        min_quantity: q,
        status: 'open',
      },
      include: {
        product: { select: { id: true, name: true, price: true, images: true } },
        creator: { select: { id: true, full_name: true } },
      },
    });
  }

  async listByProduct(productId: string) {
    return prisma.groupBuy.findMany({
      where: { product_id: productId, status: 'open' },
      include: {
        product: { select: { id: true, name: true, price: true, images: true } },
        creator: { select: { id: true, full_name: true } },
        participants: { select: { user_id: true, quantity: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async join(groupBuyId: string, userId: string, quantity = 1) {
    const group = await prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        participants: true,
        product: { select: { id: true, name: true } },
      },
    });
    if (!group) {
      const err: any = new Error('Groupe introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (group.status !== 'open') {
      const err: any = new Error('Groupe fermé');
      err.statusCode = 400;
      throw err;
    }
    if (group.creator_id === userId) {
      const err: any = new Error('Le créateur est déjà dans le groupe');
      err.statusCode = 400;
      throw err;
    }
    const existing = group.participants.find((p) => p.user_id === userId);
    if (existing) {
      const err: any = new Error('Vous avez déjà rejoint ce groupe');
      err.statusCode = 400;
      throw err;
    }
    const totalQty = group.participants.reduce((s, p) => s + p.quantity, 0) + quantity;
    await prisma.groupBuyParticipant.create({
      data: { group_buy_id: groupBuyId, user_id: userId, quantity },
    });
    return prisma.groupBuy.findUnique({
      where: { id: groupBuyId },
      include: {
        product: { select: { id: true, name: true, price: true, images: true } },
        creator: { select: { id: true, full_name: true } },
        participants: { select: { user_id: true, quantity: true } },
      },
    });
  }

  async listMy(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [participations, total] = await Promise.all([
      prisma.groupBuyParticipant.findMany({
        where: { user_id: userId },
        include: {
          group_buy: {
            include: {
              product: { select: { id: true, name: true, price: true, images: true } },
              creator: { select: { id: true, full_name: true } },
              participants: { select: { user_id: true, quantity: true } },
            },
          },
        },
        orderBy: { joined_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.groupBuyParticipant.count({ where: { user_id: userId } }),
    ]);
    const groups = participations.map((p) => ({ ...(p as { group_buy: Record<string, unknown> }).group_buy, my_quantity: p.quantity }));
    return {
      groups,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listCreatedByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [groups, total] = await Promise.all([
      prisma.groupBuy.findMany({
        where: { creator_id: userId },
        include: {
          product: { select: { id: true, name: true, price: true, images: true } },
          participants: { select: { user_id: true, quantity: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.groupBuy.count({ where: { creator_id: userId } }),
    ]);
    return {
      groups,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

const groupBuyService = new GroupBuyService();
export default groupBuyService;
