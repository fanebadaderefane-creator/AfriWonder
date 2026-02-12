import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';
import messageService from './message.service.js';

class ShipmentService {
  private toHttpError(message: string, statusCode: number) {
    const error = new Error(message) as Error & { statusCode?: number };
    error.statusCode = statusCode;
    return error;
  }

  private async assertOrderParticipant(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        user_id: true,
        items: {
          select: {
            product: {
              select: { seller_id: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw this.toHttpError('Commande non trouvee', 404);
    }

    const isBuyer = order.user_id === userId;
    const isSeller = order.items.some((item) => item.product.seller_id === userId);

    if (!isBuyer && !isSeller) {
      throw this.toHttpError('Non autorise', 403);
    }
  }

  private async assertSellerCanManageShipment(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        items: {
          select: {
            product: {
              select: { seller_id: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw this.toHttpError('Commande non trouvee', 404);
    }

    const isSeller = order.items.some((item) => item.product.seller_id === userId);
    if (!isSeller) {
      throw this.toHttpError('Seul le vendeur peut gerer cette expedition', 403);
    }
  }

  async createShipment(orderId: string, sellerId: string, data: {
    carrier: string;
    tracking_number?: string;
    estimated_delivery_days?: number;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipping: true,
        items: {
          include: {
            product: { select: { seller_id: true } },
          },
        },
      },
    });

    if (!order) {
      throw new Error('Commande non trouvee');
    }

    const isSeller = order.items.some((item) => item.product.seller_id === sellerId);
    if (!isSeller) {
      throw new Error('Seul le vendeur peut creer une expedition pour cette commande');
    }

    if (order.shipping) {
      throw new Error('Expedition deja creee pour cette commande');
    }

    const trackingNumber = data.tracking_number || this.generateTrackingNumber(data.carrier);
    const estimatedDelivery = data.estimated_delivery_days
      ? new Date(Date.now() + data.estimated_delivery_days * 24 * 60 * 60 * 1000)
      : null;

    const shipping = await prisma.shipping.create({
      data: {
        order_id: orderId,
        tracking_number: trackingNumber,
        carrier: data.carrier,
        status: 'pending',
        shipping_address: order.shipping_address || '',
        cost: 0,
        estimated_delivery: estimatedDelivery,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        tracking_number: trackingNumber,
        carrier: data.carrier,
        estimated_delivery_date: estimatedDelivery,
        shipped_at: new Date(),
        status: 'in_transit',
      },
    });

    await this.addTrackingEvent(orderId, {
      event_type: 'shipped',
      description: `Expedie via ${data.carrier}`,
      location: 'Entrepot',
    });

    try {
      await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'in_transit');
    } catch (err) {
      logger.warn('Erreur notification expedition', { orderId, err });
    }
    try {
      const sellerId = order.seller_id || order.items[0]?.product?.seller_id;
      if (sellerId) {
        await notificationService.notifyShipmentUpdate(sellerId, orderId, 'in_transit', 'seller');
      }
      await notificationService.notifyShipmentUpdate(order.user_id, orderId, 'in_transit', 'buyer');
    } catch (err) {
      logger.warn('Erreur notification shipment update', { orderId, err });
    }

    try {
      await messageService.sendOrderTrackingUpdate(orderId, 'in_transit', sellerId);
    } catch (err) {
      logger.warn('Erreur message auto expedition', { orderId, err });
    }

    logger.info('Expedition creee', { orderId, trackingNumber, carrier: data.carrier });
    return shipping;
  }

  async addTrackingEvent(orderId: string, data: {
    event_type: string;
    description?: string;
    location?: string;
  }, actorUserId?: string) {
    if (actorUserId) {
      await this.assertSellerCanManageShipment(orderId, actorUserId);
    }

    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expedition non trouvee');
    }

    const event = await prisma.trackingEvent.create({
      data: {
        shipping_id: shipping.id,
        event_type: data.event_type,
        description: data.description || data.event_type,
        location: data.location,
        timestamp: new Date(),
      },
    });

    let newStatus = shipping.status;
    if (data.event_type === 'out_for_delivery') {
      newStatus = 'in_transit';
    } else if (data.event_type === 'delivered') {
      newStatus = 'delivered';
    }

    if (newStatus !== shipping.status) {
      await prisma.shipping.update({
        where: { id: shipping.id },
        data: { status: newStatus },
      });

      if (data.event_type === 'delivered') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'delivered',
            actual_delivery_date: new Date(),
            delivered_at: new Date(),
          },
        });

        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { user_id: true, seller_id: true },
          });
          if (order) {
            await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'delivered');
            if (order.seller_id) {
              await notificationService.notifyShipmentUpdate(order.seller_id, orderId, 'delivered', 'seller');
            }
            await notificationService.notifyShipmentUpdate(order.user_id, orderId, 'delivered', 'buyer');
          }
        } catch (err) {
          logger.warn('Erreur notification livraison', { orderId, err });
        }

        if (actorUserId) {
          try {
            await messageService.sendOrderTrackingUpdate(orderId, 'delivered', actorUserId);
          } catch (err) {
            logger.warn('Erreur message auto delivered', { orderId, err });
          }
        }
      }
    }

    logger.info('Evenement de suivi ajoute', { orderId, eventType: data.event_type });
    return event;
  }

  async confirmDelivery(orderId: string, data: {
    proof_of_delivery_photo?: string;
    signature?: string;
    current_location?: string;
  }, actorUserId?: string) {
    if (actorUserId) {
      await this.assertSellerCanManageShipment(orderId, actorUserId);
    }

    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expedition non trouvee');
    }

    await prisma.shipping.update({
      where: { id: shipping.id },
      data: {
        status: 'delivered',
        actual_delivery: new Date(),
        proof_of_delivery_photo: data.proof_of_delivery_photo,
        signature: data.signature,
        current_location: data.current_location,
      },
    });

    await this.addTrackingEvent(orderId, {
      event_type: 'delivered',
      description: 'Livraison confirmee',
      location: data.current_location,
    });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        actual_delivery_date: new Date(),
        delivered_at: new Date(),
      },
    });

    if (actorUserId) {
      try {
        await messageService.sendOrderTrackingUpdate(orderId, 'delivered', actorUserId);
      } catch (err) {
        logger.warn('Erreur message auto confirm delivery', { orderId, err });
      }
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { user_id: true, seller_id: true },
      });
      if (order) {
        if (order.seller_id) {
          await notificationService.notifyShipmentUpdate(order.seller_id, orderId, 'delivered', 'seller');
        }
        await notificationService.notifyShipmentUpdate(order.user_id, orderId, 'delivered', 'buyer');
      }
    } catch (err) {
      logger.warn('Erreur notification confirm delivery', { orderId, err });
    }

    logger.info('Livraison confirmee', { orderId });
    return { orderId, delivered: true };
  }

  async updateLocation(orderId: string, location: string, actorUserId?: string) {
    if (actorUserId) {
      await this.assertSellerCanManageShipment(orderId, actorUserId);
    }

    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expedition non trouvee');
    }

    await prisma.shipping.update({
      where: { id: shipping.id },
      data: {
        current_location: location,
      },
    });

    await this.addTrackingEvent(orderId, {
      event_type: 'location_update',
      description: `Mise a jour localisation: ${location}`,
      location,
    });

    logger.info('Localisation mise a jour', { orderId, location });
    return { orderId, location };
  }

  async getTimeline(orderId: string, actorUserId?: string) {
    if (actorUserId) {
      await this.assertOrderParticipant(orderId, actorUserId);
    }

    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
      include: {
        tracking_events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!shipping) {
      throw new Error('Expedition non trouvee');
    }

    return {
      shipping,
      timeline: shipping.tracking_events,
    };
  }

  private generateTrackingNumber(carrier: string): string {
    const prefix = carrier.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

export const shipmentService = new ShipmentService();
export default shipmentService;
