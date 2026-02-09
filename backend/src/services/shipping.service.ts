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
}

export default new ShippingService();

