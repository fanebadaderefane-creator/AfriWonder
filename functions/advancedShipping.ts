import { base44 } from "@base44/sdk";

// Integrate with real shipping providers
export async function integrateShippingProvider(request) {
  const { provider, apiKey, apiSecret } = request.body;

  try {
    // Valider le fournisseur
    const validProviders = ["dhl", "fedex", "ups", "senegal_post", "jumia_express"];
    if (!validProviders.includes(provider)) {
      return { success: false, error: "Fournisseur non supporté" };
    }

    // Sauvegarder les credentials
    await base44.asServiceRole.entities.PlatformSettings.update("shipping", {
      providers: {
        [provider]: {
          enabled: true,
          api_key: apiKey,
          api_secret: apiSecret
        }
      }
    });

    return {
      success: true,
      message: `${provider} intégré avec succès`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get shipping rates from providers
export async function getRealtimeShippingRates(request) {
  const { origin, destination, weight, dimensions } = request.body;

  try {
    const rates = [];

    // Simuler les appels aux APIs des transporteurs
    // En production, appeler les APIs réelles (DHL, FedEx, etc.)
    
    rates.push({
      provider: "dhl",
      name: "DHL Express",
      cost: 15000,
      estimatedDays: 2,
      trackingIncluded: true
    });

    rates.push({
      provider: "senegal_post",
      name: "La Poste Sénégal",
      cost: 5000,
      estimatedDays: 5,
      trackingIncluded: false
    });

    rates.push({
      provider: "jumia_express",
      name: "Jumia Express",
      cost: 8000,
      estimatedDays: 3,
      trackingIncluded: true
    });

    return {
      success: true,
      rates: rates.sort((a, b) => a.cost - b.cost)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create shipment with provider
export async function createRealShipment(request) {
  const { orderId, provider, recipientName, recipientPhone, address } = request.body;

  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];

    // Appeler l'API du fournisseur
    const shipmentData = {
      reference: orderId,
      recipientName,
      recipientPhone,
      address,
      weight: 1,
      contents: order.items.map(i => ({
        description: i.product_name,
        quantity: i.quantity,
        value: i.price * i.quantity
      }))
    };

    // Simuler l'appel API
    const trackingNumber = `${provider.toUpperCase()}_${Date.now()}`;

    // Créer le tracking
    const tracking = await base44.asServiceRole.entities.DeliveryTracking.create({
      order_id: orderId,
      tracking_number: trackingNumber,
      provider,
      status: "picked_up",
      origin: "Warehouse",
      destination: address.city,
      estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      provider_reference: trackingNumber,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      trackingNumber,
      provider,
      message: "Expédition créée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Handle returns and refunds
export async function initiateReturn(request) {
  const { orderId, reason, description } = request.body;

  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];

    // Créer une demande de retour
    const returnRequest = await base44.asServiceRole.entities.Return.create({
      order_id: orderId,
      user_id: order.user_id,
      reason,
      description,
      status: "pending",
      return_tracking_number: null,
      refund_amount: order.total_amount,
      requested_at: new Date().toISOString()
    });

    // Notifier le vendeur
    const sellers = new Set(order.items.map(i => i.seller_id));
    for (const sellerId of sellers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: sellerId,
        type: "order_update",
        title: "Demande de retour",
        message: `Retour demandé pour commande #${orderId}`,
        reference_type: "order",
        reference_id: orderId,
        is_read: false
      });
    }

    return {
      success: true,
      returnId: returnRequest.id,
      refundAmount: order.total_amount,
      message: "Demande de retour créée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Approve return and process refund
export async function approveReturn(request) {
  const { returnId } = request.body;

  try {
    const returns = await base44.asServiceRole.entities.Return.filter({ id: returnId });
    if (!returns || returns.length === 0) {
      return { success: false, error: "Retour non trouvé" };
    }

    const returnRequest = returns[0];

    // Créer le remboursement
    const refund = await base44.asServiceRole.entities.Refund.create({
      order_id: returnRequest.order_id,
      user_id: returnRequest.user_id,
      amount: returnRequest.refund_amount,
      reason: returnRequest.reason,
      status: "processing",
      approved_at: new Date().toISOString()
    });

    // Mettre à jour le retour
    await base44.asServiceRole.entities.Return.update(returnId, {
      status: "approved",
      refund_id: refund.id,
      approved_at: new Date().toISOString()
    });

    // Restaurer le stock
    const orders = await base44.asServiceRole.entities.Order.filter({
      id: returnRequest.order_id
    });
    if (orders && orders.length > 0) {
      for (const item of orders[0].items) {
        const products = await base44.asServiceRole.entities.Product.filter({
          id: item.product_id
        });
        if (products && products.length > 0) {
          const p = products[0];
          await base44.asServiceRole.entities.Product.update(item.product_id, {
            stock: (p.stock || 0) + item.quantity
          });
        }
      }
    }

    return {
      success: true,
      refundId: refund.id,
      message: "Retour approuvé et remboursement traité"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}