import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getCityCoords, haversineDistanceKm } from '../config/maliCities.js';
import paymentService from './payment.service.js';
import platformRevenueService from './platformRevenue.service.js';
import withdrawalService from './withdrawal.service.js';
import fraudCheck from './fraudCheck.service.js';
import notificationService from './notification.service.js';
import escrowService from './escrow.service.js';
import invoiceService from './invoice.service.js';
import GamificationEngine from './gamification.service.js';
import messageService from './message.service.js';
import loyaltyService from './loyalty.service.js';

class OrderService {
  async list(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { user_id: userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  seller_id: true,
                },
              },
            },
          },
          shipping: {
            include: {
              tracking_events: {
                orderBy: { timestamp: 'desc' },
                take: 5,
              },
            },
          },
          payments: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          disputes: {
            where: {
              status: { in: ['open', 'investigating'] },
            },
            take: 1,
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { user_id: userId } }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Commandes oÃ¹ l'utilisateur connectÃ© est le vendeur */
  async listBySeller(sellerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          items: {
            some: {
              product: {
                seller_id: sellerId,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              profile_image: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  seller_id: true,
                },
              },
            },
          },
          shipping: {
            include: {
              tracking_events: {
                orderBy: { timestamp: 'desc' },
                take: 5,
              },
            },
          },
          buyer_reviews: {
            where: { seller_id: sellerId },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: {
                seller_id: sellerId,
              },
            },
          },
        },
      }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                seller: {
                  select: {
                    id: true,
                    username: true,
                    full_name: true,
                    profile_image: true,
                  },
                },
              },
            },
            review: true, // Avis associÃ© Ã  cet item
          },
        },
        shipping: {
          include: {
            tracking_events: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
        payments: {
          orderBy: { created_at: 'desc' },
        },
        disputes: {
          include: {
            messages: {
              orderBy: { created_at: 'asc' },
              take: 10,
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                profile_image: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    // VÃ©rifier autorisation (acheteur ou vendeur)
    const isBuyer = order.user_id === userId;
    const isSeller = order.seller_id === userId || order.items.some(item => item.product.seller?.id === userId);
    
    if (!isBuyer && !isSeller) {
      throw new Error('Non autorisé');
    }

    return order;
  }

  async createFromCart(userId: string, data: {
    shipping_address: string;
    payment_method: string;
    shipping_city?: string; // CDC: ville livraison pour calcul distance
    address_id?: string;
    items?: Array<{ product_id: string; quantity: number }>;
    source?: string; // 'marketplace' | 'live'
    live_id?: string;
    shipping_amount?: number;
    logistics_fee?: number;
    insurance_amount?: number;
    priority_fee?: number;
  }) {
    // RÃ©cupÃ©rer ou crÃ©er le panier
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

    // Normaliser les items : product_id (API) ou productId (panier)
    let rawItems: Array<{ product_id: string; quantity: number }> = [];
    if (data.items && data.items.length > 0) {
      rawItems = data.items.map((item: any) => ({
        product_id: item.product_id || item.productId,
        quantity: Number(item.quantity) || 0,
      }));
    } else {
      const cartItems = (cart.items as any[]) || [];
      rawItems = cartItems
        .filter((item: any) => item.productId || item.product_id)
        .map((item: any) => ({
          product_id: item.product_id || item.productId,
          quantity: Number(item.quantity) || 0,
        }));
    }

    if (rawItems.length === 0) {
      throw new Error('Panier vide');
    }

    // VÃ©rifier stock et rÃ©cupÃ©rer seller_id pour chaque produit
    const validated: Array<{ product_id: string; quantity: number; price: number; seller_id: string; weight_kg: number }> = [];
    let grandTotal = 0;

    for (const item of rawItems) {
      if (!item.product_id || !item.quantity) continue;

      const product = await prisma.product.findUnique({
        where: { id: item.product_id },
        select: { id: true, name: true, price: true, stock: true, seller_id: true, weight_kg: true },
      });

      if (!product) {
        throw new Error(`Produit ${item.product_id} non trouvé`);
      }
      if ((product.stock ?? 0) < item.quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}`);
      }

      grandTotal += product.price * item.quantity;
      validated.push({
        product_id: product.id,
        quantity: item.quantity,
        price: product.price,
        seller_id: product.seller_id,
        weight_kg: product.weight_kg ?? 1,
      });
    }

    if (validated.length === 0) {
      throw new Error('Aucun produit valide dans le panier');
    }

    // Grouper par vendeur : une commande par vendeur
    const bySeller = new Map<string, typeof validated>();
    for (const row of validated) {
      if (!bySeller.has(row.seller_id)) {
        bySeller.set(row.seller_id, []);
      }
      bySeller.get(row.seller_id)!.push(row);
    }

    const couponDiscount = cart.coupon_discount ?? 0;
    const totalBeforeCoupon = grandTotal;
    const discountRatio = totalBeforeCoupon > 0 ? couponDiscount / totalBeforeCoupon : 0;
    const totalAmount = Math.max(0, grandTotal - couponDiscount);

    const fraud = await fraudCheck.checkPayment(userId, totalAmount, data.payment_method || 'unknown', {});
    if (!fraud.allowed) {
      throw new Error(fraud.reason || 'Paiement refusé pour des raisons de sécurité.');
    }

    const createdOrders: any[] = [];

    for (const [sellerId, sellerItems] of bySeller) {
      const orderTotal = sellerItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const orderDiscount = Math.round(orderTotal * discountRatio * 100) / 100;
      const finalAmount = Math.max(0, orderTotal - orderDiscount);

      // CDC: Calcul frais livraison selon distance et poids (base 500 + distance + 150/kg)
      const totalWeightKg = sellerItems.reduce((s, i) => s + (i.weight_kg ?? 1) * i.quantity, 0);
      const weightFee = Math.round(totalWeightKg * 150);

      let distanceFee = 0;
      const shippingCity = data.shipping_city || (() => {
        const parts = (data.shipping_address || '').split(',').map((p) => p.trim());
        return parts.length > 1 ? parts[parts.length - 1] : null;
      })();

      if (shippingCity) {
        const sellerProfile = await prisma.sellerProfile.findFirst({
          where: { user_id: sellerId },
          select: { city: true },
        });
        const destCoords = getCityCoords(shippingCity);
        const originCoords = sellerProfile?.city ? getCityCoords(sellerProfile.city) : getCityCoords('Bamako');
        if (destCoords && originCoords) {
          const distanceKm = haversineDistanceKm(
            originCoords.lat,
            originCoords.lng,
            destCoords.lat,
            destCoords.lng
          );
          distanceFee = Math.round(Math.min(distanceKm * 50, 5000));
        }
      }

      const calculatedShipping = Math.round(Math.min(500 + weightFee + distanceFee, 15000));

      // RÃ©cupÃ©rer les produits complets pour snapshot
      const products = await prisma.product.findMany({
        where: {
          id: { in: sellerItems.map(i => i.product_id) },
        },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              full_name: true,
            },
          },
        },
      });

      const orderItems = sellerItems.map((i) => {
        const product = products.find(p => p.id === i.product_id);
        return {
          product: { connect: { id: i.product_id } },
          quantity: i.quantity,
          unit_price: i.price,
          product_snapshot: product ? {
            name: product.name,
            images: product.images,
            description: product.description,
            seller_name: product.seller?.full_name || product.seller?.username,
          } : Prisma.JsonNull,
        };
      });

      // Calculer les montants dÃ©taillÃ©s (livraison, logistique, assurance, prioritaire)
      const subtotal = orderTotal;
      const hasCustomShipping = data.shipping_amount != null && !Number.isNaN(Number(data.shipping_amount));
      const shippingAmount = hasCustomShipping ? Number(data.shipping_amount) : calculatedShipping;
      const taxAmount = 0; // Ã€ calculer selon la rÃ©gion
      const logisticsFee = Number(data.logistics_fee) || 0;
      const insuranceAmount = Number(data.insurance_amount) || 0;
      const priorityFee = Number(data.priority_fee) || 0;
      const totalWithFees = finalAmount + shippingAmount + taxAmount + logisticsFee + insuranceAmount + priorityFee;

      const order = await prisma.order.create({
        data: {
          user_id: userId,
          seller_id: sellerId, // Vendeur principal pour optimisation
          total_amount: totalWithFees,
          subtotal_amount: subtotal,
          shipping_amount: shippingAmount,
          tax_amount: taxAmount,
          currency: 'XOF',
          display_currency: 'XOF',
          status: 'pending',
          payment_status: 'pending',
          payment_method: data.payment_method,
          shipping_address: data.shipping_address,
          escrow_status: 'pending',
          source: (data.source === 'live' ? 'live' : 'marketplace') as string,
          live_id: data.source === 'live' ? data.live_id : undefined,
          logistics_fee: logisticsFee || undefined,
          insurance_amount: insuranceAmount || undefined,
          priority_fee: priorityFee || undefined,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
        },
      });

      createdOrders.push(order);

      // Notifier le vendeur de la nouvelle commande
      try {
        const buyer = await prisma.user.findUnique({
          where: { id: userId },
          select: { full_name: true, username: true },
        });
        await notificationService.notifyNewOrder(
          sellerId,
          order.id,
          finalAmount,
          buyer?.full_name || buyer?.username || undefined
        );
      } catch (err) {
        logger.warn('Erreur notification nouvelle commande', { orderId: order.id, sellerId, err });
      }

      // RÃ©server le stock pour cette commande
      for (const item of sellerItems) {
        await prisma.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
        await prisma.inventoryLog.create({
          data: {
            product_id: item.product_id,
            order_id: order.id,
            quantity: item.quantity,
            type: 'reserve',
            notes: `RÃ©servÃ© pour commande ${order.id}`,
          },
        });
      }

      if (data.payment_method === 'orange_money') {
        await prisma.transaction.create({
          data: {
            user_id: userId,
            type: 'payment',
            amount: finalAmount,
            currency: 'XOF',
            status: 'pending',
            description: `Paiement Orange Money - Commande ${order.id}`,
            reference_id: order.id,
            payment_method: 'orange_money',
          },
        });
      }
    }

    // Vider le panier une seule fois
    await prisma.cart.update({
      where: { user_id: userId },
      data: {
        items: [],
        subtotal: 0,
        coupon_code: null,
        coupon_discount: 0,
      },
    });

    logger.info('Commandes crÃ©Ã©es (une par vendeur)', {
      userId,
      orderIds: createdOrders.map((o) => o.id),
      count: createdOrders.length,
    });

    // Retourner la premiÃ¨re commande pour compatibilitÃ©, et un tableau de toutes les commandes
    return createdOrders.length === 1
      ? createdOrders[0]
      : { orders: createdOrders, count: createdOrders.length };
  }

  /**
   * Confirmer le paiement d'une commande et bloquer les fonds dans escrow
   */
  async confirmPayment(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    // Idempotence webhook : dÃ©jÃ  payÃ©e = succÃ¨s (Ã©vite double traitement et retries)
    if (order.payment_status === 'paid' || order.payment_status === 'escrow' || order.status === 'paid') {
      return { order, alreadyProcessed: true };
    }
    if (order.status !== 'pending' && order.payment_status !== 'pending') {
      throw new Error('La commande a dÃ©jÃ  Ã©tÃ© traitÃ©e');
    }

    // Vérification anti-fraude avant de traiter le paiement
    const fraud = await fraudCheck.checkPayment(order.user_id, order.total_amount, order.payment_method || 'unknown', { orderId });
    if (!fraud.allowed) {
      throw new Error(fraud.reason || 'Paiement refusé pour des raisons de sécurité.');
    }

    // Bloquer les fonds dans escrow au lieu de les distribuer immédiatement
    await escrowService.holdFunds(orderId);

    // Créer enregistrement de paiement
    await prisma.orderPayment.create({
      data: {
        order_id: orderId,
        provider: order.provider || order.payment_method || 'unknown',
        transaction_id: order.transaction_id,
        status: 'completed',
        amount: order.total_amount,
        currency: order.currency || 'XOF',
        paid_at: new Date(),
      },
    });

    // Mettre Ã  jour la transaction de paiement
    await prisma.transaction.updateMany({
      where: {
        reference_id: orderId,
        type: 'payment',
      },
      data: {
        status: 'completed',
      },
    });

    // Mettre Ã  jour le statut de la commande
    let cashbackAmount = 0;
    try {
      const config = await prisma.cashbackConfig.findFirst({ where: { is_active: true }, orderBy: { created_at: 'desc' } });
      if (config && config.percent > 0 && (config.min_order_amount == null || order.total_amount >= config.min_order_amount)) {
        cashbackAmount = Math.round((order.total_amount * config.percent / 100) * 100) / 100;
        if (cashbackAmount > 0) {
          const wallet = await prisma.wallet.findFirst({ where: { user_id: order.user_id, wallet_type: 'user' } });
          if (wallet) {
            await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: cashbackAmount } } });
            await prisma.transaction.create({
              data: {
                user_id: order.user_id,
                amount: cashbackAmount,
                type: 'cashback',
                status: 'completed',
                reference_id: orderId,
                currency: order.currency || 'XOF',
                description: 'Cashback commande',
              },
            });
          }
        }
      }
    } catch (err) {
      logger.warn('Cashback commande échoué', { orderId, err });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        payment_status: 'escrow',
        paid_at: new Date(),
        ...(cashbackAmount > 0 && { cashback_amount: cashbackAmount }),
      },
    });

    // CrÃ©er la facture (pour tÃ©lÃ©chargement PDF)
    try {
      await invoiceService.getOrCreateInvoice(orderId);
    } catch (err) {
      logger.warn('Erreur crÃ©ation facture', { orderId, err });
    }

    // Notifier l'acheteur du changement de statut
    try {
      await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'paid');
    } catch (err) {
      logger.warn('Erreur notification statut commande', { orderId, err });
    }

    logger.info('Paiement commande confirmÃ© et fonds bloquÃ©s dans escrow', { orderId });
    return updatedOrder;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            product: {
              select: {
                seller_id: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    const isBuyer = order.user_id === userId;
    const isSeller = order.seller_id === userId || order.items.some((item) => item.product?.seller_id === userId);

    if (!isBuyer && !isSeller) {
      throw new Error('Non autorisé');
    }

    const normalizedStatus = String(status || '').trim();
    const allStatuses = new Set([
      'pending',
      'pending_payment',
      'paid',
      'processing',
      'preparing',
      'in_transit',
      'delivered',
      'completed',
      'cancelled',
    ]);
    if (!allStatuses.has(normalizedStatus)) {
      throw new Error('Statut invalide');
    }

    const actor = isSeller && !isBuyer ? 'seller' : 'buyer';
    const buyerAllowedStatuses = new Set(['cancelled']);
    const sellerAllowedStatuses = new Set(['processing', 'preparing', 'in_transit', 'delivered', 'completed', 'cancelled']);

    if (actor === 'buyer' && !buyerAllowedStatuses.has(normalizedStatus)) {
      throw new Error('Transition non autorisée pour l\'acheteur');
    }
    if (actor === 'seller' && !sellerAllowedStatuses.has(normalizedStatus)) {
      throw new Error('Transition non autorisée pour le vendeur');
    }

    const sellerTransitions: Record<string, Set<string>> = {
      pending: new Set(['processing', 'preparing', 'cancelled']),
      pending_payment: new Set(['processing', 'preparing', 'cancelled']),
      paid: new Set(['processing', 'preparing', 'in_transit', 'cancelled']),
      processing: new Set(['preparing', 'in_transit', 'completed', 'cancelled']),
      preparing: new Set(['in_transit', 'completed', 'cancelled']),
      in_transit: new Set(['delivered', 'completed']),
      delivered: new Set(['completed']),
      completed: new Set([]),
      cancelled: new Set([]),
    };

    const buyerTransitions: Record<string, Set<string>> = {
      pending: new Set(['cancelled']),
      pending_payment: new Set(['cancelled']),
      paid: new Set([]),
      processing: new Set([]),
      preparing: new Set([]),
      in_transit: new Set([]),
      delivered: new Set([]),
      completed: new Set([]),
      cancelled: new Set([]),
    };

    const transitionTable = actor === 'seller' ? sellerTransitions : buyerTransitions;
    const currentStatus = order.status;
    const allowedNextStatuses = transitionTable[currentStatus] || new Set<string>();
    if (!allowedNextStatuses.has(normalizedStatus)) {
      throw new Error(`Transition invalide: ${currentStatus} -> ${normalizedStatus}`);
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: normalizedStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Si annulée, libérer le stock
    if (normalizedStatus === 'cancelled' && order.status !== 'cancelled') {
      for (const item of updated.items) {
        await prisma.product.update({
          where: { id: item.product_id },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        await prisma.inventoryLog.create({
          data: {
            product_id: item.product_id,
            order_id: id,
            quantity: item.quantity,
            type: 'release',
            notes: `Stock libéré - Commande annulée`,
          },
        });
      }
    }

    // Notifier l'acheteur du changement de statut
    try {
      await notificationService.notifyOrderStatusUpdate(order.user_id, id, normalizedStatus);
    } catch (err) {
      logger.warn('Erreur notification statut commande', { orderId: id, err });
    }
    try {
      await messageService.sendOrderTrackingUpdate(id, normalizedStatus, userId);
    } catch (err) {
      logger.warn('Erreur message automatique suivi commande', { orderId: id, err });
    }

    logger.info('Statut commande mis à jour', { orderId: id, status: normalizedStatus, actor });
    return updated;
  }

  async cancel(id: string, userId: string) {
    const deadlineHours = Number(process.env.CANCELLATION_DEADLINE_HOURS) || 24;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { user_id: true, status: true, payment_status: true, created_at: true },
    });
    if (!order) throw new Error('Commande non trouvée');
    if (order.user_id !== userId) throw new Error('Non autorisé');
    if (order.status !== 'pending' && order.status !== 'pending_payment') {
      throw new Error('Annulation impossible : la commande a dÃ©jÃ  Ã©tÃ© traitÃ©e.');
    }
    const deadlineMs = deadlineHours * 60 * 60 * 1000;
    if (Date.now() - new Date(order.created_at).getTime() > deadlineMs) {
      throw new Error(`Annulation impossible après ${deadlineHours}h. Contactez le support.`);
    }
    // Si dÃ©jÃ  payÃ©, le remboursement sera gÃ©rÃ© par escrow (refund) si implÃ©mentÃ© cÃ´tÃ© webhook/annulation
    return this.updateStatus(id, 'cancelled', userId);
  }

  async confirmReception(id: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { user_id: true, escrow_status: true },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    if (order.user_id !== userId) {
      throw new Error('Non autorisé');
    }

    // DÃ©bloquer les fonds escrow vers le vendeur
    try {
      await escrowService.releaseFunds(id, 'delivery_confirmed');
    } catch (err: any) {
      logger.warn('Erreur dÃ©blocage escrow', { orderId: id, err: err.message });
      // Continuer mÃªme si escrow Ã©choue
    }

    // Mettre Ã  jour le statut
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'completed',
        delivered_at: new Date(),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Notifier le vendeur
    const sellerId = updated.seller_id ?? updated.items[0]?.product?.seller_id;
    try {
      if (sellerId) {
        await notificationService.notifyOrderStatusUpdate(sellerId, id, 'completed');
      }
    } catch (err) {
      logger.warn('Erreur notification vendeur', { orderId: id, err });
    }
    try {
      await messageService.sendOrderTrackingUpdate(id, 'completed', userId);
    } catch (err) {
      logger.warn('Erreur message auto completion commande', { orderId: id, err });
    }

    // Gamification : premiÃ¨re vente vendeur
    if (sellerId) {
      try {
        const completedCount = await prisma.order.count({
          where: {
            status: 'completed',
            OR: [
              { seller_id: sellerId },
              { items: { some: { product: { seller_id: sellerId } } } },
            ],
          },
        });
        if (completedCount === 1) {
          GamificationEngine.onFirstSale(sellerId).catch((e) =>
            logger.warn('Gamification onFirstSale', { sellerId, err: e })
          );
        }
      } catch (err) {
        logger.warn('Erreur gamification first sale', { sellerId, err });
      }
    }

    // CPO 10.21 — Points fidélité vendeur (programme fidélité business)
    try {
      await loyaltyService.addPointsFromOrder(id);
    } catch (err: any) {
      logger.warn('Erreur fidélité vendeur', { orderId: id, err: err?.message });
    }

    // Gamification : points acheteur pour commande livrÃ©e (1 pt / 100 FCFA, min 10, max 200)
    try {
      const pointsToAdd = Math.min(200, Math.max(10, Math.floor((updated.total_amount ?? 0) / 100)));
      await prisma.userPoints.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          total_points: pointsToAdd,
          lifetime_points: pointsToAdd,
          current_level_points: pointsToAdd,
          last_points_awarded: new Date(),
        },
        update: {
          total_points: { increment: pointsToAdd },
          lifetime_points: { increment: pointsToAdd },
          current_level_points: { increment: pointsToAdd },
          last_points_awarded: new Date(),
        },
      });
      logger.info('Points achat attribuÃ©s', { orderId: id, userId, points: pointsToAdd });
    } catch (err) {
      logger.warn('Erreur attribution points achat', { orderId: id, err });
    }

    logger.info('RÃ©ception confirmÃ©e et fonds dÃ©bloquÃ©s', { orderId: id });
    return updated;
  }

  /** Commandes passÃ©es pendant un live (pour le crÃ©ateur du live) */
  async listByLiveId(liveId: string, creatorId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          live_id: liveId,
          source: 'live',
          seller_id: creatorId,
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
          user: { select: { id: true, full_name: true, username: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({
        where: { live_id: liveId, source: 'live', seller_id: creatorId },
      }),
    ]);
    return {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Stats commandes pour l'acheteur (analytics profil) */
  async getUserOrderStats(userId: string) {
    const orders = await prisma.order.findMany({
      where: {
        user_id: userId,
        status: { notIn: ['cancelled'] },
      },
      select: {
        total_amount: true,
        created_at: true,
        items: {
          select: {
            product: {
              select: { category: true },
            },
          },
        },
      },
    });

    const total_spent = orders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
    const order_count = orders.length;
    const categoryCount: Record<string, number> = {};
    const yearly_history: Record<number, number> = {};

    for (const order of orders) {
      const year = new Date(order.created_at).getFullYear();
      yearly_history[year] = (yearly_history[year] ?? 0) + (order.total_amount ?? 0);
      const cat = order.items?.[0]?.product?.category as string | undefined;
      if (cat) {
        categoryCount[cat] = (categoryCount[cat] ?? 0) + 1;
      }
    }

    const favorite_category =
      Object.keys(categoryCount).length > 0
        ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    const LOYAL_THRESHOLD_ORDERS = 5;
    const LOYAL_THRESHOLD_SPENT = 50000;
    const is_loyal_client = order_count >= LOYAL_THRESHOLD_ORDERS || total_spent >= LOYAL_THRESHOLD_SPENT;

    return {
      total_spent,
      order_count,
      favorite_category,
      yearly_history,
      is_loyal_client,
      currency: 'XOF',
    };
  }
}

export const orderService = new OrderService();
export default orderService;


