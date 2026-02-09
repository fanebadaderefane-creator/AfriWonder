import { base44 } from "@base44/sdk";

// Create order from cart
export async function createOrder(request) {
  const { userId, shippingAddressId, paymentMethodId, notes } = request.body;

  try {
    // Récupérer le panier
    const carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    if (!carts || carts.length === 0) {
      return { success: false, error: "Panier vide" };
    }

    const cart = carts[0];
    if (!cart.items || cart.items.length === 0) {
      return { success: false, error: "Panier vide" };
    }

    // Récupérer l'adresse de livraison
    const addresses = await base44.asServiceRole.entities.Address.filter({
      id: shippingAddressId
    });
    if (!addresses || addresses.length === 0) {
      return { success: false, error: "Adresse non trouvée" };
    }

    const shippingAddress = addresses[0];

    // Réserver le stock pour chaque produit
    for (const item of cart.items) {
      await reserveInventory({
        body: {
          productId: item.product_id,
          quantity: item.quantity,
          orderId: null // À remplir après création de la commande
        }
      });
    }

    // Créer la commande
    const totalAmount = cart.subtotal - (cart.coupon_discount || 0);
    const order = await base44.asServiceRole.entities.Order.create({
      user_id: userId,
      items: cart.items,
      subtotal: cart.subtotal,
      coupon_discount: cart.coupon_discount || 0,
      total_amount: totalAmount,
      status: "pending",
      payment_status: "unpaid",
      shipping_address: {
        full_name: shippingAddress.full_name,
        phone: shippingAddress.phone,
        address_line1: shippingAddress.address_line1,
        address_line2: shippingAddress.address_line2,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country
      },
      notes,
      created_at: new Date().toISOString()
    });

    // Créer les réservations finales avec l'ID de commande
    for (const item of cart.items) {
      await base44.asServiceRole.entities.InventoryLog.create({
        product_id: item.product_id,
        action: "order_created",
        quantity: item.quantity,
        order_id: order.id,
        timestamp: new Date().toISOString()
      });
    }

    // Créer une notification pour le vendeur
    const sellers = new Set(cart.items.map(item => item.seller_id));
    for (const sellerId of sellers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: sellerId,
        type: "order_update",
        title: "Nouvelle commande",
        message: `Commande #${order.id} reçue`,
        reference_type: "order",
        reference_id: order.id,
        is_read: false
      });
    }

    return {
      success: true,
      orderId: order.id,
      totalAmount,
      message: "Commande créée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get order details
export async function getOrderDetails(request) {
  const { orderId } = request.query;

  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];

    // Récupérer le tracking
    const tracking = await base44.asServiceRole.entities.DeliveryTracking.filter({
      order_id: orderId
    });

    return {
      success: true,
      order: {
        ...order,
        tracking: tracking ? tracking[0] : null
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update order status
export async function updateOrderStatus(request) {
  const { orderId, newStatus, notes } = request.body;

  try {
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Statut invalide" };
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });

    // Créer un log de statut
    await base44.asServiceRole.entities.OrderStatusLog.create({
      order_id: orderId,
      old_status: order.status,
      new_status: newStatus,
      notes,
      timestamp: new Date().toISOString()
    });

    // Notifier le client
    await base44.asServiceRole.entities.Notification.create({
      user_id: order.user_id,
      type: "order_update",
      title: `Commande ${newStatus}`,
      message: `Votre commande #${orderId} est maintenant ${newStatus}`,
      reference_type: "order",
      reference_id: orderId,
      is_read: false
    });

    return {
      success: true,
      status: newStatus,
      message: "Statut mis à jour"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get user orders
export async function getUserOrders(request) {
  const { userId, status, limit = 20 } = request.query;

  try {
    let orders = await base44.asServiceRole.entities.Order.filter({ user_id: userId });

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return {
      success: true,
      orders: orders.slice(-limit).sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Cancel order
export async function cancelOrder(request) {
  const { orderId, reason } = request.body;

  try {
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return { success: false, error: "Commande non trouvée" };
    }

    const order = orders[0];
    
    // Vérifier si cancellable
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
      return { success: false, error: "Commande non annulable" };
    }

    // Annuler les réservations
    for (const item of order.items) {
      await cancelReservation({
        body: {
          productId: item.product_id,
          quantity: item.quantity,
          orderId
        }
      });
    }

    // Mettre à jour la commande
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: "cancelled",
      cancellation_reason: reason,
      updated_at: new Date().toISOString()
    });

    // Créer un remboursement
    if (order.payment_status === "paid") {
      await base44.asServiceRole.entities.Refund.create({
        order_id: orderId,
        user_id: order.user_id,
        amount: order.total_amount,
        reason: reason,
        status: "processing",
        created_at: new Date().toISOString()
      });
    }

    return {
      success: true,
      message: "Commande annulée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Helper - reserve inventory
async function reserveInventory(params) {
  const { body } = params;
  const { productId, quantity } = body;
  
  const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
  if (products && products.length > 0) {
    const product = products[0];
    const newReserved = (product.reserved_stock || 0) + quantity;
    await base44.asServiceRole.entities.Product.update(productId, {
      reserved_stock: newReserved
    });
  }
}

// Helper - cancel reservation
async function cancelReservation(params) {
  const { body } = params;
  const { productId, quantity } = body;
  
  const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
  if (products && products.length > 0) {
    const product = products[0];
    const newReserved = Math.max((product.reserved_stock || 0) - quantity, 0);
    await base44.asServiceRole.entities.Product.update(productId, {
      reserved_stock: newReserved
    });
  }
}