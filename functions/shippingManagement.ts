import { base44 } from "@base44/sdk";

// Calculate shipping cost
export async function calculateShipping(request) {
  const { orderId, origin, destination, weight = 1 } = request.body;

  try {
    // Récupérer les tarifs de livraison
    const shippingRates = await base44.asServiceRole.entities.ShippingRate.filter({});

    // Trouver le transporteur le moins cher
    let cheapestOption = null;
    let minCost = Infinity;

    for (const rate of shippingRates || []) {
      if (rate.destination_country === destination || rate.destination_country === "*") {
        const baseCost = rate.base_cost || 0;
        const weightCost = (weight / 1000) * (rate.cost_per_kg || 0);
        const totalCost = baseCost + weightCost;

        if (totalCost < minCost) {
          minCost = totalCost;
          cheapestOption = {
            provider: rate.provider,
            estimatedDays: rate.estimated_delivery_days,
            cost: totalCost
          };
        }
      }
    }

    if (!cheapestOption) {
      return { success: false, error: "Livraison non disponible" };
    }

    return {
      success: true,
      shippingCost: cheapestOption.cost,
      provider: cheapestOption.provider,
      estimatedDelivery: cheapestOption.estimatedDays
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create shipping label
export async function createShippingLabel(request) {
  const { orderId, shippingProvider } = request.body;

  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];
    const trackingNumber = `${shippingProvider.toUpperCase()}_${Date.now()}`;

    // Créer le tracking
    const tracking = await base44.asServiceRole.entities.DeliveryTracking.create({
      order_id: orderId,
      tracking_number: trackingNumber,
      provider: shippingProvider,
      status: "pending",
      origin: "Warehouse",
      destination: order.shipping_address.city,
      weight: 1,
      estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    });

    // Générer un label fictif
    const labelUrl = `https://shipping.afriwonder.app/label/${trackingNumber}.pdf`;

    return {
      success: true,
      trackingNumber,
      labelUrl,
      tracking
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update tracking
export async function updateTracking(request) {
  const { trackingNumber, status, location, notes } = request.body;

  try {
    const trackings = await base44.asServiceRole.entities.DeliveryTracking.filter({
      tracking_number: trackingNumber
    });

    if (!trackings || trackings.length === 0) {
      return { success: false, error: "Tracking non trouvé" };
    }

    const tracking = trackings[0];
    await base44.asServiceRole.entities.DeliveryTracking.update(tracking.id, {
      status,
      current_location: location,
      last_update: new Date().toISOString()
    });

    // Créer un événement de tracking
    await base44.asServiceRole.entities.TrackingEvent.create({
      tracking_id: tracking.id,
      status,
      location,
      notes,
      timestamp: new Date().toISOString()
    });

    // Notifier le client si livré
    if (status === "delivered") {
      const orders = await base44.asServiceRole.entities.Order.filter({
        id: tracking.order_id
      });

      if (orders && orders.length > 0) {
        await base44.asServiceRole.entities.Order.update(orders[0].id, {
          status: "delivered"
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: orders[0].user_id,
          type: "order_update",
          title: "Colis livré",
          message: `Votre commande #${tracking.order_id} a été livrée`,
          reference_type: "order",
          reference_id: tracking.order_id,
          is_read: false
        });
      }
    }

    return {
      success: true,
      message: "Tracking mis à jour"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get tracking info
export async function getTrackingInfo(request) {
  const { trackingNumber } = request.query;

  try {
    const trackings = await base44.asServiceRole.entities.DeliveryTracking.filter({
      tracking_number: trackingNumber
    });

    if (!trackings || trackings.length === 0) {
      return { success: false, error: "Tracking non trouvé" };
    }

    const tracking = trackings[0];
    const events = await base44.asServiceRole.entities.TrackingEvent.filter({
      tracking_id: tracking.id
    });

    return {
      success: true,
      tracking,
      events: events.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}