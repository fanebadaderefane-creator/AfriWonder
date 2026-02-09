import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import { validateUrls } from '../utils/urlValidator.js';

interface ListOptions {
  page: number;
  limit: number;
  category?: string;
  subcategory?: string;
  product_type?: string;  // physical | digital | service
  seller_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  verified_seller?: boolean;
  seller_country?: string;
  min_rating?: number;
  delivery_option?: string;  // livraison_moto | point_relais | retrait_boutique | envoi_national
  sort?: string;
  order?: 'asc' | 'desc';
}

class ProductService {
  async list(options: ListOptions) {
    const { page, limit, category, subcategory, product_type, seller_id, search, min_price, max_price, verified_seller, seller_country, min_rating, delivery_option, sort, order } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    where.status = 'active';

    if (category) where.category = category;
    if (subcategory) where.subcategory = subcategory;
    if (product_type) where.product_type = product_type;
    if (seller_id) where.seller_id = seller_id;

    if (search && search.trim()) {
      try {
        const term = search.trim();
        const ftsIds = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT id FROM "Product"
          WHERE status = 'active'
          AND to_tsvector('french', name || ' ' || COALESCE(description, '')) @@ plainto_tsquery('french', ${term})
        `);
        const ids = ftsIds.map((r) => r.id);
        if (ids.length > 0) {
          where.id = { in: ids };
        } else {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' as any } },
            { description: { contains: search, mode: 'insensitive' as any } },
          ];
        }
      } catch {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' as any } },
          { description: { contains: search, mode: 'insensitive' as any } },
        ];
      }
    }

    if (min_price != null && min_price > 0 && max_price != null && max_price > 0) {
      where.price = { gte: min_price, lte: max_price };
    } else if (min_price != null && min_price > 0) {
      where.price = { gte: min_price };
    } else if (max_price != null && max_price > 0) {
      where.price = { lte: max_price };
    }

    const sellerWhere: any = {};
    if (verified_seller === true) {
      sellerWhere.is_verified = true;
      sellerWhere.status = 'active';
    }
    if (seller_country) sellerWhere.country = seller_country;
    if (min_rating != null && min_rating > 0) sellerWhere.rating = { gte: min_rating };
    if (Object.keys(sellerWhere).length > 0) {
      where.seller = { seller_profile: sellerWhere };
    }

    if (delivery_option) {
      where.delivery_options = { not: null };
    }

    const sortField = sort || 'created_at';
    const sortOrder = order || 'desc';
    const orderBy: any =
      sortField === 'price'
        ? { price: sortOrder }
        : sortField === 'sales'
          ? { order_items: { _count: sortOrder } }
          : sortField === 'popularity'
            ? { reviews: { _count: sortOrder } }
            : { created_at: sortOrder };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
              seller_profile: {
                select: {
                  is_verified: true,
                  rating: true,
                  total_sales: true,
                  status: true,
                  country: true,
                  city: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
            seller_profile: {
              select: {
                is_verified: true,
                rating: true,
                total_sales: true,
                country: true,
                city: true,
                status: true,
              },
            },
          },
        },
        reviews: {
          where: { status: 'approved' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                profile_image: true,
              },
            },
            replies: {
              include: {
                review: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      const error: any = new Error('Produit non trouvé');
      error.statusCode = 404;
      throw error;
    }

    return product;
  }

  async create(data: {
    name: string;
    description: string;
    price: number;
    stock?: number;
    seller_id: string;
    images?: string[];
    category?: string;
    subcategory?: string;
    product_type?: string;
    status?: string;
    currency?: string;
    brand?: string;
    condition?: string;
    delivery_options?: string[] | any;
    video_url?: string;
  }) {
    // Valider les données requises
    if (!data.name || !data.description || data.price === undefined) {
      const error: any = new Error('Nom, description et prix sont requis');
      error.statusCode = 400;
      throw error;
    }

    if (data.price <= 0) {
      const error: any = new Error('Le prix doit être supérieur à 0');
      error.statusCode = 400;
      throw error;
    }

    // ⚠️ REJETER les URLs Base44 dans les images
    validateUrls(data.images, 'images');

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: data.seller_id },
    });
    if (!sellerProfile) {
      const err: any = new Error('Vous devez créer un compte vendeur avant d\'ajouter des produits (Devenir vendeur)');
      err.statusCode = 400;
      throw err;
    }
    if (sellerProfile.status !== 'active') {
      const err: any = new Error('Votre compte vendeur est suspendu ou bloqué');
      err.statusCode = 403;
      throw err;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock ?? 0,
        seller_id: data.seller_id,
        images: data.images ?? [],
        category: data.category,
        subcategory: data.subcategory,
        product_type: data.product_type ?? 'physical',
        status: data.status ?? 'active',
        currency: data.currency ?? 'XOF',
        brand: data.brand,
        condition: data.condition,
        delivery_options: data.delivery_options ?? undefined,
        video_url: data.video_url ?? undefined,
      },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    logger.info('Produit créé', { productId: product.id, sellerId: data.seller_id });
    return product;
  }

  async update(id: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    category: string;
    subcategory: string;
    product_type: string;
    status: string;
    currency: string;
    brand: string;
    condition: string;
    delivery_options: string[] | any;
    video_url: string;
  }>, sellerId: string) {
    // ⚠️ REJETER les URLs Base44 dans les images
    if (data.images) {
      validateUrls(data.images, 'images');
    }
    // Vérifier que l'utilisateur est le vendeur
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true },
    });

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisé');
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            full_name: true,
            profile_image: true,
          },
        },
      },
    });

    logger.info('Produit mis à jour', { productId: id, sellerId });
    return updated;
  }

  async delete(id: string, sellerId: string) {
    // Vérifier que l'utilisateur est le vendeur
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true },
    });

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisé');
    }

    await prisma.product.delete({
      where: { id },
    });

    logger.info('Produit supprimé', { productId: id, sellerId });
  }

  async updateStock(id: string, quantity: number, sellerId: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true, stock: true },
    });

    if (!product) {
      throw new Error('Produit non trouvé');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisé');
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      throw new Error('Stock insuffisant');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

    // Log dans InventoryLog
    await prisma.inventoryLog.create({
      data: {
        product_id: id,
        quantity: Math.abs(quantity),
        type: quantity > 0 ? 'restock' : 'adjustment',
        notes: `Stock mis à jour: ${quantity > 0 ? '+' : ''}${quantity}`,
      },
    });

    return updated;
  }

  // Frais de promotion : 100% pour la plateforme
  private readonly PROMOTION_FEE = 5000; // 5000 FCFA par promotion
  private readonly FLASH_SALE_FEE = 10000; // 10000 FCFA par vente flash

  /**
   * Créer une promotion pour un produit (payant)
   */
  async createPromotion(productId: string, sellerId: string, data: {
    discount: number;
    startDate: Date;
    endDate: Date;
    phone: string;
  }) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.seller_id !== sellerId) {
      throw new Error('Product not found or unauthorized');
    }

    // Créer la promotion en attente
    const promotion = await prisma.productPromotion.create({
      data: {
        product_id: productId,
        discount: data.discount,
        start_date: data.startDate,
        end_date: data.endDate,
        is_active: false, // Actif après paiement
      },
    });

    // Créer transaction pour paiement
    const transaction = await prisma.transaction.create({
      data: {
        user_id: sellerId,
        type: 'product_promotion',
        amount: this.PROMOTION_FEE,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Promotion produit - ${product.name}`,
        reference_id: promotion.id,
      },
    });

    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        sellerId,
        transaction.id,
        {
          amount: this.PROMOTION_FEE,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/products/${productId}?promotion=success`,
        }
      );

      return {
        ...promotion,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      await prisma.productPromotion.delete({ where: { id: promotion.id } });
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Créer une vente flash (payant)
   */
  async createFlashSale(productId: string, sellerId: string, data: {
    discount: number;
    startTime: Date;
    endTime: Date;
    stockLimit: number;
    phone: string;
  }) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.seller_id !== sellerId) {
      throw new Error('Product not found or unauthorized');
    }

    // Créer la vente flash en attente
    const flashSale = await prisma.flashSale.create({
      data: {
        product_id: productId,
        discount: data.discount,
        start_time: data.startTime,
        end_time: data.endTime,
        stock_limit: data.stockLimit,
        is_active: false, // Actif après paiement
      },
    });

    // Créer transaction pour paiement
    const transaction = await prisma.transaction.create({
      data: {
        user_id: sellerId,
        type: 'flash_sale',
        amount: this.FLASH_SALE_FEE,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Vente flash - ${product.name}`,
        reference_id: flashSale.id,
      },
    });

    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        sellerId,
        transaction.id,
        {
          amount: this.FLASH_SALE_FEE,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/products/${productId}?flashsale=success`,
        }
      );

      return {
        ...flashSale,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      await prisma.flashSale.delete({ where: { id: flashSale.id } });
      await prisma.transaction.delete({ where: { id: transaction.id } });
      throw error;
    }
  }

  /**
   * Confirmer le paiement d'une promotion
   */
  async confirmPromotionPayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'product_promotion') {
      throw new Error('Transaction not found or invalid type');
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed' },
    });

    // Créditer la plateforme (100% des frais)
    await platformRevenueService.addRevenue(
      transaction.amount,
      'product_promotions',
      `Frais promotion produit - ${transaction.reference_id}`,
      transactionId
    );

    // Activer la promotion
    await prisma.productPromotion.update({
      where: { id: transaction.reference_id! },
      data: { is_active: true },
    });

    return transaction;
  }

  /**
   * Confirmer le paiement d'une vente flash
   */
  async confirmFlashSalePayment(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.type !== 'flash_sale') {
      throw new Error('Transaction not found or invalid type');
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed' },
    });

    // Créditer la plateforme (100% des frais)
    await platformRevenueService.addRevenue(
      transaction.amount,
      'flash_sales',
      `Frais vente flash - ${transaction.reference_id}`,
      transactionId
    );

    // Activer la vente flash
    await prisma.flashSale.update({
      where: { id: transaction.reference_id! },
      data: { is_active: true },
    });

    return transaction;
  }
}

export const productService = new ProductService();
export default productService;

