/**
 * CPO 10.21 — Programmes fidélité (business)
 * Points par achat, seuil de récompense (réduction, etc.)
 */
import prisma from '../config/database.js';

export interface LoyaltyProgramUpdate {
  points_per_purchase?: number;
  reward_threshold?: number;
  reward_type?: string;
  reward_value?: number | null;
  is_active?: boolean;
}

class LoyaltyService {
  /** Récupérer ou créer le programme du vendeur */
  async getOrCreateProgram(sellerId: string) {
    let program = await prisma.loyaltyProgram.findUnique({
      where: { seller_id: sellerId },
    });
    if (!program) {
      program = await prisma.loyaltyProgram.create({
        data: {
          seller_id: sellerId,
          points_per_purchase: 1,
          reward_threshold: 100,
          reward_type: 'discount',
          reward_value: 10,
          is_active: true,
        },
      });
    }
    return program;
  }

  /** Mettre à jour le programme (vendeur) */
  async updateProgram(sellerId: string, data: LoyaltyProgramUpdate) {
    await this.getOrCreateProgram(sellerId);
    return prisma.loyaltyProgram.update({
      where: { seller_id: sellerId },
      data: {
        ...(data.points_per_purchase != null && { points_per_purchase: Math.max(0, data.points_per_purchase) }),
        ...(data.reward_threshold != null && { reward_threshold: Math.max(1, data.reward_threshold) }),
        ...(data.reward_type != null && { reward_type: data.reward_type }),
        ...(data.reward_value !== undefined && { reward_value: data.reward_value }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
    });
  }

  /** Programme d'un vendeur (public ou acheteur) */
  async getProgramBySeller(sellerId: string) {
    return prisma.loyaltyProgram.findUnique({
      where: { seller_id: sellerId, is_active: true },
    });
  }

  /** Points de l'utilisateur chez un vendeur */
  async getUserLoyalty(userId: string, sellerId: string) {
    return prisma.userLoyalty.findUnique({
      where: { user_id: userId, seller_id: sellerId },
      include: {
        program: true,
      },
    });
  }

  /** Toutes les fidélités de l'utilisateur (mes points) */
  async listMyLoyalties(userId: string) {
    return prisma.userLoyalty.findMany({
      where: { user_id: userId },
      include: {
        program: {
          include: {
            seller: {
              select: { id: true, full_name: true, profile_image: true, username: true },
            },
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    });
  }

  /**
   * Accorder des points après une commande complétée.
   * points_earned = floor(subtotal * points_per_purchase / 1000) — ex: 1 pt / 1000 FCFA
   */
  async addPointsFromOrder(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
      },
    });
    if (!order || order.status !== 'completed') return;
    const sellerId = order.seller_id ?? order.items[0]?.product?.seller_id;
    if (!sellerId || order.user_id === sellerId) return;

    const program = await prisma.loyaltyProgram.findUnique({
      where: { seller_id: sellerId },
    });
    if (!program || !program.is_active) return;

    const subtotal = order.subtotal_amount ?? order.total_amount ?? 0;
    const pointsToAdd = Math.floor(subtotal * (program.points_per_purchase / 1000));
    if (pointsToAdd < 1) return;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.userLoyalty.findUnique({
        where: { user_id_seller_id: { user_id: order.user_id, seller_id: sellerId } },
      });
      if (existing) {
        await tx.userLoyalty.update({
          where: { id: existing.id },
          data: {
            points_balance: { increment: pointsToAdd },
            lifetime_points: { increment: pointsToAdd },
          },
        });
      } else {
        await tx.userLoyalty.create({
          data: {
            user_id: order.user_id,
            seller_id: sellerId,
            points_balance: pointsToAdd,
            lifetime_points: pointsToAdd,
          },
        });
      }
    });
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
