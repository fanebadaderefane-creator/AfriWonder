/**
 * CPO 6.35 — Enchères produit
 */
import prisma from '../config/database.js';

export interface CreateAuctionInput {
  product_id: string;
  seller_id: string;
  start_price: number;
  end_at: Date;
}

export interface PlaceBidInput {
  product_id: string;
  user_id: string;
  amount: number;
}

class AuctionService {
  async create(data: CreateAuctionInput) {
    const product = await prisma.product.findUnique({
      where: { id: data.product_id },
      select: { id: true, seller_id: true },
    });
    if (!product) {
      const err: any = new Error('Produit introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (product.seller_id !== data.seller_id) {
      const err: any = new Error('Seul le vendeur peut créer l\'enchère');
      err.statusCode = 403;
      throw err;
    }
    const existing = await prisma.productAuction.findUnique({
      where: { product_id: data.product_id },
    });
    if (existing) {
      const err: any = new Error('Une enchère existe déjà pour ce produit');
      err.statusCode = 409;
      throw err;
    }
    if (data.start_price <= 0 || data.end_at <= new Date()) {
      const err: any = new Error('Prix de départ > 0 et date de fin future requises');
      err.statusCode = 400;
      throw err;
    }
    return prisma.productAuction.create({
      data: {
        product_id: data.product_id,
        seller_id: data.seller_id,
        start_price: data.start_price,
        current_bid: data.start_price,
        end_at: data.end_at,
        status: 'open',
      },
      include: {
        product: { select: { id: true, name: true } },
        seller: { select: { id: true, full_name: true } },
      },
    });
  }

  async getByProductId(productId: string) {
    const auction = await prisma.productAuction.findUnique({
      where: { product_id: productId },
      include: {
        product: { select: { id: true, name: true, image: true } },
        seller: { select: { id: true, full_name: true, profile_image: true } },
        current_bidder: { select: { id: true, full_name: true } },
      },
    });
    return auction;
  }

  async placeBid(data: PlaceBidInput) {
    const auction = await prisma.productAuction.findUnique({
      where: { product_id: data.product_id },
      include: { product: { select: { seller_id: true } } },
    });
    if (!auction) {
      const err: any = new Error('Enchère introuvable');
      err.statusCode = 404;
      throw err;
    }
    if (auction.status !== 'open') {
      const err: any = new Error('Enchère fermée');
      err.statusCode = 400;
      throw err;
    }
    if (auction.end_at <= new Date()) {
      const err: any = new Error('Enchère terminée');
      err.statusCode = 400;
      throw err;
    }
    if (auction.product.seller_id === data.user_id) {
      const err: any = new Error('Le vendeur ne peut pas enchérir');
      err.statusCode = 400;
      throw err;
    }
    const minBid = auction.current_bid + (auction.current_bid * 0.05); // 5% minimum
    if (data.amount < minBid) {
      const err: any = new Error(`Enchère minimale: ${minBid.toFixed(2)}`);
      err.statusCode = 400;
      throw err;
    }
    return prisma.productAuction.update({
      where: { product_id: data.product_id },
      data: {
        current_bid: data.amount,
        current_bidder_id: data.user_id,
      },
      include: {
        product: { select: { id: true, name: true } },
        current_bidder: { select: { id: true, full_name: true } },
      },
    });
  }

  async listBySeller(sellerId: string, options?: { status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(50, Math.max(1, options?.limit ?? 20));
    const where: { seller_id: string; status?: string } = { seller_id: sellerId };
    if (options?.status && ['open', 'closed'].includes(options.status)) {
      where.status = options.status;
    }
    const [items, total] = await Promise.all([
      prisma.productAuction.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, image: true } },
          current_bidder: { select: { id: true, full_name: true } },
        },
        orderBy: { end_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productAuction.count({ where }),
    ]);
    return {
      auctions: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Fermer les enchères expirées (à appeler par un job ou manuellement) */
  async closeExpired() {
    const result = await prisma.productAuction.updateMany({
      where: { status: 'open', end_at: { lt: new Date() } },
      data: { status: 'closed' },
    });
    return result.count;
  }
}

const auctionService = new AuctionService();
export default auctionService;
