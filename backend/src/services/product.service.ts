import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import { validateUrls } from '../utils/urlValidator.js';
const PRODUCT_FIELD_NAMES = new Set(
  ((Prisma as any)?.dmmf?.datamodel?.models?.find((m: any) => m.name === 'Product')?.fields ?? []).map(
    (f: any) => f.name
  )
);

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
interface SuggestionOptions {
  query: string;
  limit: number;
}
interface RecommendationOptions {
  userId?: string;
  limit: number;
}
interface NearbyOptions {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  delivery_option?: string;
  verified_seller?: boolean;
  min_rating?: number;
  seller_country?: string;
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
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
      const error: any = new Error('Produit non trouvÃ©');
      error.statusCode = 404;
      throw error;
    }

    return product;
  }

  async suggestions(options: SuggestionOptions) {
    const query = options.query.trim();
    if (!query) return [];

    const limit = Math.max(1, Math.min(options.limit || 8, 20));
    const startsWith = `${query}%`;
    const contains = `%${query}%`;

    const rows = await prisma.$queryRaw<{ id: string; name: string; category: string | null }[]>(Prisma.sql`
      SELECT id, name, category
      FROM "Product"
      WHERE status = 'active'
        AND (name ILIKE ${startsWith} OR name ILIKE ${contains} OR COALESCE(description, '') ILIKE ${contains})
      ORDER BY
        CASE WHEN name ILIKE ${startsWith} THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      id: r.id,
      text: r.name,
      category: r.category || '',
      type: 'product',
    }));
  }

  async highlights(trendingLimit: number = 8, newestLimit: number = 8) {
    const tLimit = Math.max(1, Math.min(trendingLimit || 8, 20));
    const nLimit = Math.max(1, Math.min(newestLimit || 8, 20));

    const [trending, newest] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'active' },
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
        orderBy: [{ order_items: { _count: 'desc' } }, { created_at: 'desc' }],
        take: tLimit,
      }),
      prisma.product.findMany({
        where: { status: 'active' },
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
        orderBy: { created_at: 'desc' },
        take: nLimit,
      }),
    ]);

    return { trending, newest };
  }

  async recommendations(options: RecommendationOptions) {
    const limit = Math.max(1, Math.min(options.limit || 8, 30));
    const includeSeller = {
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
    } as const;

    // Visiteur: fallback recommandations génériques (tendance + récent)
    if (!options.userId) {
      return prisma.product.findMany({
        where: { status: 'active' },
        include: includeSeller,
        orderBy: [{ order_items: { _count: 'desc' } }, { created_at: 'desc' }],
        take: limit,
      });
    }

    const userId = options.userId;
    const categoryScore = new Map<string, number>();
    const brandScore = new Map<string, number>();
    const excludedIds = new Set<string>();

    const addSignal = (category?: string | null, brand?: string | null, weight: number = 1) => {
      if (category && category.trim()) {
        categoryScore.set(category, (categoryScore.get(category) || 0) + weight);
      }
      if (brand && brand.trim()) {
        brandScore.set(brand, (brandScore.get(brand) || 0) + weight);
      }
    };

    const recentOrders = await prisma.order.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 30,
      select: { id: true },
    });
    const orderIds = recentOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      const orderItems = await prisma.orderItem.findMany({
        where: { order_id: { in: orderIds } },
        select: {
          product_id: true,
          product: { select: { category: true, brand: true } },
        },
        take: 200,
      });
      for (const item of orderItems) {
        excludedIds.add(item.product_id);
        addSignal(item.product?.category, item.product?.brand, 3);
      }
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: { user_id: userId },
      select: {
        product_id: true,
        product: { select: { category: true, brand: true } },
      },
      take: 100,
      orderBy: { created_at: 'desc' },
    });
    for (const item of wishlistItems) {
      excludedIds.add(item.product_id);
      addSignal(item.product?.category, item.product?.brand, 2);
    }

    const cart = await prisma.cart.findUnique({
      where: { user_id: userId },
      select: { items: true },
    });
    const cartProductIds = (((cart?.items as any[]) || []) as any[])
      .map((i) => i?.productId || i?.product_id)
      .filter(Boolean);
    if (cartProductIds.length > 0) {
      const cartProducts = await prisma.product.findMany({
        where: { id: { in: cartProductIds } },
        select: { id: true, category: true, brand: true },
      });
      for (const p of cartProducts) {
        excludedIds.add(p.id);
        addSignal(p.category, p.brand, 2);
      }
    }

    const topCategories = [...categoryScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k]) => k);
    const topBrands = [...brandScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const personalizedWhere: any = {
      status: 'active',
      id: { notIn: [...excludedIds] },
    };
    if (topCategories.length > 0 || topBrands.length > 0) {
      personalizedWhere.OR = [];
      if (topCategories.length > 0) personalizedWhere.OR.push({ category: { in: topCategories } });
      if (topBrands.length > 0) personalizedWhere.OR.push({ brand: { in: topBrands } });
    }

    let items = await prisma.product.findMany({
      where: personalizedWhere,
      include: includeSeller,
      orderBy: [{ order_items: { _count: 'desc' } }, { created_at: 'desc' }],
      take: limit,
    });

    if (items.length < limit) {
      const filled = await prisma.product.findMany({
        where: {
          status: 'active',
          id: { notIn: [...excludedIds, ...items.map((i) => i.id)] },
        },
        include: includeSeller,
        orderBy: { created_at: 'desc' },
        take: limit - items.length,
      });
      items = [...items, ...filled];
    }

    return items;
  }

  async nearby(options: NearbyOptions) {
    const lat = Number(options.latitude);
    const lon = Number(options.longitude);
    const radiusKm = Math.max(1, Math.min(Number(options.radiusKm || 50), 500));
    const limit = Math.max(1, Math.min(Number(options.limit || 100), 300));

    const whereClauses: Prisma.Sql[] = [
      Prisma.sql`p.status = 'active'`,
      Prisma.sql`p.latitude IS NOT NULL`,
      Prisma.sql`p.longitude IS NOT NULL`,
    ];

    if (options.category?.trim()) {
      whereClauses.push(Prisma.sql`p.category = ${options.category.trim()}`);
    }
    if (options.search?.trim()) {
      const q = `%${options.search.trim()}%`;
      whereClauses.push(
        Prisma.sql`(p.name ILIKE ${q} OR COALESCE(p.description, '') ILIKE ${q})`
      );
    }
    if (Number.isFinite(options.min_price) && (options.min_price as number) > 0) {
      whereClauses.push(Prisma.sql`p.price >= ${options.min_price as number}`);
    }
    if (Number.isFinite(options.max_price) && (options.max_price as number) > 0) {
      whereClauses.push(Prisma.sql`p.price <= ${options.max_price as number}`);
    }
    if (options.condition?.trim()) {
      whereClauses.push(Prisma.sql`p.condition = ${options.condition.trim()}`);
    }
    if (options.delivery_option?.trim()) {
      const delivery = `%${options.delivery_option.trim()}%`;
      whereClauses.push(Prisma.sql`COALESCE(p.delivery_options::text, '') ILIKE ${delivery}`);
    }
    if (options.verified_seller === true) {
      whereClauses.push(Prisma.sql`sp.is_verified = true`);
      whereClauses.push(Prisma.sql`sp.status = 'active'`);
    }
    if (Number.isFinite(options.min_rating) && (options.min_rating as number) > 0) {
      whereClauses.push(Prisma.sql`COALESCE(sp.rating, 0) >= ${options.min_rating as number}`);
    }
    if (options.seller_country?.trim()) {
      whereClauses.push(Prisma.sql`sp.country = ${options.seller_country.trim()}`);
    }
    if (Number.isFinite(options.min_lat)) {
      whereClauses.push(Prisma.sql`p.latitude >= ${options.min_lat as number}`);
    }
    if (Number.isFinite(options.max_lat)) {
      whereClauses.push(Prisma.sql`p.latitude <= ${options.max_lat as number}`);
    }
    if (Number.isFinite(options.min_lng)) {
      whereClauses.push(Prisma.sql`p.longitude >= ${options.min_lng as number}`);
    }
    if (Number.isFinite(options.max_lng)) {
      whereClauses.push(Prisma.sql`p.longitude <= ${options.max_lng as number}`);
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM (
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.images,
          p.category,
          p.condition,
          p.delivery_options,
          p.latitude,
          p.longitude,
          sp.is_verified AS seller_verified,
          sp.rating AS seller_rating,
          sp.country AS seller_country,
          p.created_at,
          (
            6371 * acos(
              cos(radians(${lat}))
              * cos(radians(p.latitude))
              * cos(radians(p.longitude) - radians(${lon}))
              + sin(radians(${lat})) * sin(radians(p.latitude))
            )
          ) AS distance_km
        FROM "Product" p
        LEFT JOIN "SellerProfile" sp ON sp.user_id = p.seller_id
        WHERE ${Prisma.join(whereClauses, ' AND ')}
      ) x
      WHERE x.distance_km <= ${radiusKm}
      ORDER BY x.distance_km ASC, x.created_at DESC
      LIMIT ${limit}
    `);

    return rows.map((r) => ({
      ...r,
      distance_km: Number(r.distance_km),
    }));
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
    latitude?: number;
    longitude?: number;
    weight_kg?: number;
    negotiable_price?: boolean;
    valid_until?: string | Date;
    variants?: { name: string; value: string; price_diff?: number; stock?: number }[];
  }) {
    // Valider les donnÃ©es requises
    if (!data.name || !data.description || data.price === undefined) {
      const error: any = new Error('Nom, description et prix sont requis');
      error.statusCode = 400;
      throw error;
    }

    if (data.price <= 0) {
      const error: any = new Error('Le prix doit Ãªtre supÃ©rieur Ã  0');
      error.statusCode = 400;
      throw error;
    }

    // CDC: minimum 5 photos côté backend
    if (!Array.isArray(data.images) || data.images.length < 5) {
      const error: any = new Error('Le cahier des charges exige au moins 5 photos par produit');
      error.statusCode = 400;
      throw error;
    }

    // Rejeter les URLs de domaines externes non autorisÃ©s dans les images
    validateUrls(data.images, 'images');

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { user_id: data.seller_id },
    });
    if (!sellerProfile) {
      const err: any = new Error('Vous devez crÃ©er un compte vendeur avant d\'ajouter des produits (Devenir vendeur)');
      err.statusCode = 400;
      throw err;
    }
    if (sellerProfile.status !== 'active') {
      const err: any = new Error('Votre compte vendeur est suspendu ou bloquÃ©');
      err.statusCode = 403;
      throw err;
    }

    // CDC: limite produits selon formule (free: 10, starter: 100, business/enterprise: illimitÃ©)
    const SELLER_MAX_PRODUCTS: Record<string, number> = {
      free: 10,
      starter: 100,
      business: -1,
      enterprise: -1,
    };
    const tier = sellerProfile.subscription_tier || 'free';
    const maxProducts = SELLER_MAX_PRODUCTS[tier] ?? 10;
    if (maxProducts >= 0) {
      const count = await prisma.product.count({
        where: { seller_id: data.seller_id, status: 'active' },
      });
      if (count >= maxProducts) {
        const err: any = new Error(
          `Limite atteinte (${maxProducts} produits pour la formule ${tier}). Passez Ã  une formule supÃ©rieure.`
        );
        err.statusCode = 400;
        throw err;
      }
    }

    const createData: any = {
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
    };
    if (PRODUCT_FIELD_NAMES.has('delivery_options')) createData.delivery_options = data.delivery_options ?? undefined;
    if (PRODUCT_FIELD_NAMES.has('video_url')) createData.video_url = data.video_url ?? undefined;
    if (PRODUCT_FIELD_NAMES.has('latitude')) createData.latitude = data.latitude ?? undefined;
    if (PRODUCT_FIELD_NAMES.has('longitude')) createData.longitude = data.longitude ?? undefined;
    if (PRODUCT_FIELD_NAMES.has('weight_kg')) createData.weight_kg = data.weight_kg ?? undefined;
    if (PRODUCT_FIELD_NAMES.has('negotiable_price')) createData.negotiable_price = data.negotiable_price ?? false;
    if (PRODUCT_FIELD_NAMES.has('valid_until')) {
      createData.valid_until = data.valid_until ? new Date(data.valid_until) : undefined;
    }

    const product = await prisma.product.create({
      data: createData,
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

    // CDC: crÃ©er les variantes produit (taille, couleur, etc.)
    const variants = data.variants as { name: string; value: string; price_diff?: number; stock?: number }[] | undefined;
    if (variants && Array.isArray(variants) && variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants
          .filter((v) => v.name && v.value)
          .map((v) => ({
            product_id: product.id,
            name: v.name.trim(),
            value: v.value.trim(),
            price_diff: v.price_diff ?? 0,
            stock: v.stock ?? 0,
          })),
      });
    }

    logger.info('Produit crÃ©Ã©', { productId: product.id, sellerId: data.seller_id });
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
    latitude: number;
    longitude: number;
    weight_kg: number;
    negotiable_price: boolean;
    valid_until: string | Date;
  }>, sellerId: string) {
    // CDC: si images fournies à la mise à jour, conserver minimum 5 photos
    if (data.images !== undefined && data.images.length < 5) {
      const error: any = new Error('Le cahier des charges exige au moins 5 photos par produit');
      error.statusCode = 400;
      throw error;
    }

    // Rejeter les URLs de domaines externes non autorisÃ©s dans les images
    if (data.images) {
      validateUrls(data.images, 'images');
    }
    // VÃ©rifier que l'utilisateur est le vendeur
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true },
    });

    if (!product) {
      throw new Error('Produit non trouvÃ©');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisÃ©');
    }

    const sanitizedData: any = { ...data };
    const advancedFields = ['delivery_options', 'video_url', 'latitude', 'longitude', 'weight_kg', 'negotiable_price', 'valid_until'];
    for (const field of advancedFields) {
      if (!PRODUCT_FIELD_NAMES.has(field)) {
        delete sanitizedData[field];
      }
    }
    if (sanitizedData.valid_until) {
      sanitizedData.valid_until = new Date(sanitizedData.valid_until);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: sanitizedData,
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

    logger.info('Produit mis Ã  jour', { productId: id, sellerId });
    return updated;
  }

  async delete(id: string, sellerId: string) {
    // VÃ©rifier que l'utilisateur est le vendeur
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true },
    });

    if (!product) {
      throw new Error('Produit non trouvÃ©');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisÃ©');
    }

    await prisma.product.delete({
      where: { id },
    });

    logger.info('Produit supprimÃ©', { productId: id, sellerId });
  }

  async updateStock(id: string, quantity: number, sellerId: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { seller_id: true, stock: true },
    });

    if (!product) {
      throw new Error('Produit non trouvÃ©');
    }

    if (product.seller_id !== sellerId) {
      throw new Error('Non autorisÃ©');
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
        notes: `Stock mis Ã  jour: ${quantity > 0 ? '+' : ''}${quantity}`,
      },
    });

    return updated;
  }

  // Frais de promotion : 100% pour la plateforme
  private readonly PROMOTION_FEE = 5000; // 5000 FCFA par promotion
  private readonly FLASH_SALE_FEE = 10000; // 10000 FCFA par vente flash

  /**
   * CrÃ©er une promotion pour un produit (payant)
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

    // CrÃ©er la promotion en attente
    const promotion = await prisma.productPromotion.create({
      data: {
        product_id: productId,
        discount: data.discount,
        start_date: data.startDate,
        end_date: data.endDate,
        is_active: false, // Actif aprÃ¨s paiement
      },
    });

    // CrÃ©er transaction pour paiement
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
   * CrÃ©er une vente flash (payant)
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

    // CrÃ©er la vente flash en attente
    const flashSale = await prisma.flashSale.create({
      data: {
        product_id: productId,
        discount: data.discount,
        start_time: data.startTime,
        end_time: data.endTime,
        stock_limit: data.stockLimit,
        is_active: false, // Actif aprÃ¨s paiement
      },
    });

    // CrÃ©er transaction pour paiement
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

    // CrÃ©diter la plateforme (100% des frais)
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

    // CrÃ©diter la plateforme (100% des frais)
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



