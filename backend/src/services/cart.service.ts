import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

class CartService {
  async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { user_id: userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          user_id: userId,
          items: [],
          subtotal: 0,
        },
      });
    }

    return cart;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    if (product.status !== 'active') {
      throw new Error('Ce produit n\'est pas disponible');
    }

    const available = product.stock ?? 0;
    if (available <= 0) {
      throw new Error('Stock insuffisant pour ce produit');
    }

    let cart = await this.getCart(userId);
    const items = cart.items as any[];

    const existingItemIndex = items.findIndex(
      (item: any) => item.productId === productId
    );

    let newQuantity: number;
    if (existingItemIndex >= 0) {
      newQuantity = Math.min(items[existingItemIndex].quantity + quantity, available);
      items[existingItemIndex].quantity = newQuantity;
    } else {
      newQuantity = Math.min(quantity, available);
      items.push({
        productId: product.id,
        sellerId: product.seller_id,
        name: product.name,
        price: product.price,
        quantity: newQuantity,
        image: (product.images as string[])?.[0] || null,
      });
    }

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    cart = await prisma.cart.update({
      where: { user_id: userId },
      data: {
        items,
        subtotal,
        last_updated: new Date(),
      },
    });

    logger.info('Item added to cart', { userId, productId, quantity });
    return cart;
  }

  async removeItem(userId: string, productId: string) {
    let cart = await this.getCart(userId);
    const items = (cart.items as any[]).filter(
      (item: any) => item.productId !== productId
    );

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    cart = await prisma.cart.update({
      where: { user_id: userId },
      data: {
        items,
        subtotal,
        last_updated: new Date(),
      },
    });

    logger.info('Item removed from cart', { userId, productId });
    return cart;
  }

  async updateQuantity(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { stock: true, status: true },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const available = product.stock ?? 0;
    const cappedQuantity = Math.min(quantity, available);

    let cart = await this.getCart(userId);
    const items = cart.items as any[];

    const itemIndex = items.findIndex(
      (item: any) => item.productId === productId
    );

    if (itemIndex >= 0) {
      items[itemIndex].quantity = cappedQuantity;
    }

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    cart = await prisma.cart.update({
      where: { user_id: userId },
      data: {
        items,
        subtotal,
        last_updated: new Date(),
      },
    });

    logger.info('Cart quantity updated', { userId, productId, quantity });
    return cart;
  }

  async clearCart(userId: string) {
    const cart = await prisma.cart.update({
      where: { user_id: userId },
      data: {
        items: [],
        subtotal: 0,
        coupon_code: null,
        coupon_discount: 0,
        last_updated: new Date(),
      },
    });

    logger.info('Cart cleared', { userId });
    return cart;
  }

  /** Retourne le panier avec le détail des frais par vendeur (commission 8-12%, défaut 10% — modèle AfriWonder Marketplace) */
  async getCartWithFeesBreakdown(userId: string) {
    const commissionService = (await import('./commission.service.js')).default;
    const cart = await this.getCart(userId);
    const items = (cart.items as any[]) || [];
    if (items.length === 0) {
      return { ...cart, feesBySeller: [], totalFees: 0 };
    }
    const productIds = [...new Set(items.map((i: any) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, seller_id: true },
    });
    const productSellerMap = Object.fromEntries(products.map((p) => [p.id, p.seller_id]));
    const bySeller: Record<string, { sellerId: string; subtotal: number; platformFee: number; sellerAmount: number; itemCount: number }> = {};
    for (const item of items) {
      const sellerId = item.sellerId || productSellerMap[item.productId];
      if (!sellerId) continue;
      const lineTotal = item.price * item.quantity;
      const { platform: fee, seller: sellerAmount } = commissionService.marketplaceSeller(lineTotal);
      if (!bySeller[sellerId]) {
        bySeller[sellerId] = { sellerId, subtotal: 0, platformFee: 0, sellerAmount: 0, itemCount: 0 };
      }
      bySeller[sellerId].subtotal += lineTotal;
      bySeller[sellerId].platformFee += fee;
      bySeller[sellerId].sellerAmount += sellerAmount;
      bySeller[sellerId].itemCount += 1;
    }
    const feesBySeller = Object.values(bySeller).map((v) => ({
      ...v,
      platformFee: Math.round(v.platformFee * 100) / 100,
      sellerAmount: Math.round(v.sellerAmount * 100) / 100,
    }));
    const totalFees = feesBySeller.reduce((s, v) => s + v.platformFee, 0);
    return { ...cart, feesBySeller, totalFees };
  }

  async applyCoupon(userId: string, couponCode: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });

    if (!coupon || coupon.is_used || coupon.expires_at < new Date()) {
      throw new Error('Invalid or expired coupon');
    }

    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      throw new Error('Coupon usage limit reached');
    }

    const cart = await this.getCart(userId);
    const discount = (cart.subtotal * coupon.discount_percentage) / 100;

    const updatedCart = await prisma.cart.update({
      where: { user_id: userId },
      data: {
        coupon_code: couponCode,
        coupon_discount: discount,
      },
    });

    logger.info('Coupon applied', { userId, couponCode });
    return updatedCart;
  }
}

export default new CartService();

