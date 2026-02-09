import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';

/**
 * Service de gestion des expéditions et suivi logistique
 * 
 * Fonctionnalités :
 * - Génération numéro de suivi
 * - Mise à jour timeline
 * - Preuve de livraison (photo, signature)
 * - Estimation livraison dynamique
 */
class ShipmentService {
  /**
   * Créer une expédition pour une commande
   */
  async createShipment(orderId: string, data: {
    carrier: string;
    tracking_number?: string;
    estimated_delivery_days?: number;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipping: true,
      },
    });

    if (!order) {
      throw new Error('Commande non trouvée');
    }

    if (order.shipping) {
      throw new Error('Expédition déjà créée pour cette commande');
    }

    // Générer numéro de suivi si non fourni
    const trackingNumber = data.tracking_number || this.generateTrackingNumber(data.carrier);

    // Calculer date livraison estimée
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
        cost: 0, // À calculer selon le transporteur
        estimated_delivery: estimatedDelivery,
      },
    });

    // Mettre à jour la commande
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

    // Ajouter événement de suivi initial
    await this.addTrackingEvent(orderId, {
      event_type: 'shipped',
      description: `Expédié via ${data.carrier}`,
      location: 'Entrepôt',
    });

    // Notifier l'acheteur
    try {
      await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'in_transit');
    } catch (err) {
      logger.warn('Erreur notification expédition', { orderId, err });
    }

    logger.info('Expédition créée', { orderId, trackingNumber, carrier: data.carrier });
    return shipping;
  }

  /**
   * Ajouter un événement de suivi
   */
  async addTrackingEvent(orderId: string, data: {
    event_type: string;
    description?: string;
    location?: string;
  }) {
    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expédition non trouvée');
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

    // Mettre à jour le statut de l'expédition selon l'événement
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

      // Mettre à jour la commande
      if (data.event_type === 'delivered') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'delivered',
            actual_delivery_date: new Date(),
            delivered_at: new Date(),
          },
        });

        // Notifier l'acheteur
        try {
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { user_id: true },
          });
          if (order) {
            await notificationService.notifyOrderStatusUpdate(order.user_id, orderId, 'delivered');
          }
        } catch (err) {
          logger.warn('Erreur notification livraison', { orderId, err });
        }
      }
    }

    logger.info('Événement de suivi ajouté', { orderId, eventType: data.event_type });
    return event;
  }

  /**
   * Confirmer la livraison avec preuve (photo, signature)
   */
  async confirmDelivery(orderId: string, data: {
    proof_of_delivery_photo?: string;
    signature?: string;
    current_location?: string;
  }) {
    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expédition non trouvée');
    }

    // Mettre à jour l'expédition
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

    // Ajouter événement de livraison
    await this.addTrackingEvent(orderId, {
      event_type: 'delivered',
      description: 'Livraison confirmée',
      location: data.current_location,
    });

    // Mettre à jour la commande
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        actual_delivery_date: new Date(),
        delivered_at: new Date(),
      },
    });

    logger.info('Livraison confirmée', { orderId });
    return { orderId, delivered: true };
  }

  /**
   * Mettre à jour la localisation actuelle
   */
  async updateLocation(orderId: string, location: string) {
    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
    });

    if (!shipping) {
      throw new Error('Expédition non trouvée');
    }

    await prisma.shipping.update({
      where: { id: shipping.id },
      data: {
        current_location: location,
      },
    });

    await this.addTrackingEvent(orderId, {
      event_type: 'location_update',
      description: `Mise à jour localisation: ${location}`,
      location: location,
    });

    logger.info('Localisation mise à jour', { orderId, location });
    return { orderId, location };
  }

  /**
   * Obtenir la timeline complète d'une expédition
   */
  async getTimeline(orderId: string) {
    const shipping = await prisma.shipping.findUnique({
      where: { order_id: orderId },
      include: {
        tracking_events: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!shipping) {
      throw new Error('Expédition non trouvée');
    }

    return {
      shipping,
      timeline: shipping.tracking_events,
    };
  }

  /**
   * Générer un numéro de suivi unique
   */
  private generateTrackingNumber(carrier: string): string {
    const prefix = carrier.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

export const shipmentService = new ShipmentService();
export default shipmentService;
