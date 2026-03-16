import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import platformRevenueService from './platformRevenue.service.js';
import paymentService from './payment.service.js';

class ShippingService {
  async getShippingRates(destinationCountry: string, weight: number) {
    const rates = await prisma.shippingRate.findMany({
      where: {
        destination_country: destinationCountry,
        is_active: true,
      },
    });

    return rates.map(rate => ({
      ...rate,
      total_cost: rate.base_cost + (rate.cost_per_kg * weight),
    }));
  }

  // Commission plateforme : 7% sur frais de livraison
  private readonly PLATFORM_COMMISSION_RATE = 0.07;

  async createShipping(orderId: string, data: {
    trackingNumber: string;
    carrier: string;
    shippingAddress: string;
    cost: number;
    estimatedDelivery?: Date;
  }) {
    const shipping = await prisma.shipping.create({
      data: {
        order_id: orderId,
        tracking_number: data.trackingNumber,
        carrier: data.carrier,
        shipping_address: data.shippingAddress,
        cost: data.cost,
        estimated_delivery: data.estimatedDelivery,
        status: 'pending',
      },
      include: {
        order: true,
        tracking_events: true,
      },
    });

    // Calculer et créditer la commission plateforme sur les frais de livraison
    const platformFee = data.cost * this.PLATFORM_COMMISSION_RATE;
    await platformRevenueService.addRevenue(
      platformFee,
      'shipping',
      `Commission frais livraison - Commande ${orderId}`,
      shipping.id
    );

    logger.info('Shipping created', { orderId, shippingId: shipping.id, platformFee });
    return shipping;
  }

  async updateShippingStatus(shippingId: string, status: string) {
    const shipping = await prisma.shipping.update({
      where: { id: shippingId },
      data: { status },
      include: {
        order: true,
        tracking_events: true,
      },
    });

    logger.info('Shipping status updated', { shippingId, status });
    return shipping;
  }

  async addTrackingEvent(shippingId: string, data: {
    eventType: string;
    location?: string;
    description?: string;
  }) {
    const event = await prisma.trackingEvent.create({
      data: {
        shipping_id: shippingId,
        event_type: data.eventType,
        location: data.location,
        description: data.description,
      },
    });

    logger.info('Tracking event added', { shippingId, eventId: event.id });
    return event;
  }

  async getShippingByOrder(orderId: string) {
    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
      include: {
        tracking_events: {
          orderBy: { timestamp: 'desc' },
        },
        order: true,
      },
    });

    return shipping;
  }

  async getShippingByTrackingNumber(trackingNumber: string) {
    const shipping = await prisma.shipping.findUnique({
      where: { tracking_number: trackingNumber },
      include: {
        tracking_events: {
          orderBy: { timestamp: 'desc' },
        },
        order: true,
      },
    });

    return shipping;
  }

  /**
   * Créer un shipping avec paiement Orange Money
   */
  async createShippingWithPayment(orderId: string, userId: string, data: {
    trackingNumber: string;
    carrier: string;
    shippingAddress: string;
    cost: number;
    estimatedDelivery?: Date;
    phone: string;
  }) {
    // Créer le shipping en attente
    const shipping = await prisma.shipping.create({
      data: {
        order_id: orderId,
        tracking_number: data.trackingNumber,
        carrier: data.carrier,
        shipping_address: data.shippingAddress,
        cost: data.cost,
        estimated_delivery: data.estimatedDelivery,
        status: 'pending_payment',
      },
    });

    // Créer une transaction pour le paiement Orange Money
    const transaction = await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'shipping_payment',
        amount: data.cost,
        currency: 'XOF',
        status: 'pending',
        payment_method: 'orange_money',
        phone_number: data.phone,
        description: `Frais de livraison - Commande ${orderId}`,
        reference_id: shipping.id,
      },
    });

    // Initier le paiement Orange Money
    try {
      const paymentResult = await paymentService.initiateOrangeMoneyPayment(
        userId,
        shipping.id,
        {
          amount: data.cost,
          phone: data.phone,
          returnUrl: `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/orders/${orderId}?shipping=success`,
        }
      );

      logger.info('Shipping créé et paiement Orange Money initié', {
        shippingId: shipping.id,
        orderId,
        cost: data.cost,
      });

      return {
        ...shipping,
        paymentUrl: paymentResult.paymentUrl,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      await prisma.shipping.update({
        where: { id: shipping.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  /**
   * Confirmer le paiement du shipping
   */
  async confirmShippingPayment(shippingId: string) {
    const shipping = await prisma.shipping.findUnique({
      where: { id: shippingId },
      include: {
        order: true,
      },
    });

    if (!shipping) {
      throw new Error('Shipping not found');
    }

    // Mettre à jour le statut
    await prisma.shipping.update({
      where: { id: shippingId },
      data: { status: 'paid' },
    });

    // Mettre à jour la transaction
    await prisma.transaction.updateMany({
      where: {
        reference_id: shippingId,
        type: 'shipping_payment',
      },
      data: {
        status: 'completed',
      },
    });

    // Calculer et créditer la commission plateforme (7%)
    const platformFee = shipping.cost * this.PLATFORM_COMMISSION_RATE;
    await platformRevenueService.addRevenue(
      platformFee,
      'shipping',
      `Commission frais livraison - Commande ${shipping.order_id}`,
      shippingId
    );

    logger.info('Shipping payment confirmed', {
      shippingId,
      cost: shipping.cost,
      platformFee,
    });

    return shipping;
  }

  // ——— Livraison colis (standalone, hors commande) ———
  async createParcel(userId: string, data: {
    recipient_name: string;
    recipient_phone?: string;
    recipient_address: string;
    destination_country: string;
    weight_kg: number;
    carrier: string;
    tracking_number?: string;
    cost: number;
    estimated_delivery?: Date;
  }) {
    const trackingNumber = data.tracking_number || `PCL-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const parcel = await prisma.parcelShipment.create({
      data: {
        user_id: userId,
        recipient_name: data.recipient_name,
        recipient_phone: data.recipient_phone,
        recipient_address: data.recipient_address,
        destination_country: data.destination_country,
        weight_kg: data.weight_kg,
        carrier: data.carrier,
        tracking_number: trackingNumber,
        cost: data.cost,
        estimated_delivery: data.estimated_delivery,
        status: 'pending',
      },
      include: { tracking_events: true },
    });
    logger.info('Parcel shipment created', { parcelId: parcel.id, userId });
    return parcel;
  }

  async listMyParcels(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [parcels, total] = await Promise.all([
      prisma.parcelShipment.findMany({
        where: { user_id: userId },
        include: { tracking_events: { orderBy: { timestamp: 'desc' }, take: 1 } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.parcelShipment.count({ where: { user_id: userId } }),
    ]);
    return { parcels, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getParcel(parcelId: string, userId: string) {
    const parcel = await prisma.parcelShipment.findFirst({
      where: { id: parcelId, user_id: userId },
      include: { tracking_events: { orderBy: { timestamp: 'desc' } } },
    });
    if (!parcel) throw new Error('Colis non trouvé');
    return parcel;
  }

  async getParcelByTrackingNumber(trackingNumber: string) {
    const parcel = await prisma.parcelShipment.findUnique({
      where: { tracking_number: trackingNumber },
      include: { tracking_events: { orderBy: { timestamp: 'desc' } } },
    });
    return parcel;
  }

  async updateParcelStatus(parcelId: string, userId: string, status: string) {
    const parcel = await prisma.parcelShipment.findFirst({
      where: { id: parcelId, user_id: userId },
    });
    if (!parcel) throw new Error('Colis non trouvé');
    const updated = await prisma.parcelShipment.update({
      where: { id: parcelId },
      data: { status, ...(status === 'delivered' ? { actual_delivery: new Date() } : {}) },
      include: { tracking_events: true },
    });
    return updated;
  }

  async addParcelTrackingEvent(parcelId: string, userId: string, data: { event_type: string; location?: string; description?: string }) {
    const parcel = await prisma.parcelShipment.findFirst({
      where: { id: parcelId, user_id: userId },
    });
    if (!parcel) throw new Error('Colis non trouvé');
    const event = await prisma.parcelTrackingEvent.create({
      data: { parcel_id: parcelId, event_type: data.event_type, location: data.location, description: data.description },
    });
    return event;
  }
}

export default new ShippingService();

