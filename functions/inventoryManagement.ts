import { base44 } from "@base44/sdk";

// Get inventory
export async function getInventory(request) {
  const { productId } = request.query;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    return {
      success: true,
      productId,
      stock: product.stock,
      reserved: product.reserved_stock || 0,
      available: product.stock - (product.reserved_stock || 0)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Reserve inventory
export async function reserveInventory(request) {
  const { productId, quantity, orderId } = request.body;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    const available = product.stock - (product.reserved_stock || 0);

    if (available < quantity) {
      return { success: false, error: "Stock insuffisant" };
    }

    // Réserver le stock
    const newReserved = (product.reserved_stock || 0) + quantity;
    await base44.asServiceRole.entities.Product.update(productId, {
      reserved_stock: newReserved
    });

    // Créer un log de réservation
    await base44.asServiceRole.entities.InventoryLog.create({
      product_id: productId,
      action: "reserve",
      quantity,
      order_id: orderId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      reserved: newReserved,
      available: product.stock - newReserved
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Confirm inventory (release reserved stock)
export async function confirmInventory(request) {
  const { productId, quantity, orderId } = request.body;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    const newStock = product.stock - quantity;
    const newReserved = Math.max((product.reserved_stock || 0) - quantity, 0);

    await base44.asServiceRole.entities.Product.update(productId, {
      stock: newStock,
      reserved_stock: newReserved
    });

    await base44.asServiceRole.entities.InventoryLog.create({
      product_id: productId,
      action: "confirm",
      quantity,
      order_id: orderId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      stock: newStock,
      reserved: newReserved
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Cancel reservation
export async function cancelReservation(request) {
  const { productId, quantity, orderId } = request.body;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    const newReserved = Math.max((product.reserved_stock || 0) - quantity, 0);

    await base44.asServiceRole.entities.Product.update(productId, {
      reserved_stock: newReserved
    });

    await base44.asServiceRole.entities.InventoryLog.create({
      product_id: productId,
      action: "cancel_reservation",
      quantity,
      order_id: orderId,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      reserved: newReserved,
      available: product.stock - newReserved
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get low stock alerts
export async function getLowStockAlerts(request) {
  const { sellerId, threshold = 10 } = request.query;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({ 
      seller_id: sellerId 
    });

    const lowStockProducts = products.filter(p => p.stock <= threshold);

    return {
      success: true,
      alerts: lowStockProducts.map(p => ({
        productId: p.id,
        title: p.title,
        stock: p.stock,
        reserved: p.reserved_stock || 0
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get inventory history
export async function getInventoryHistory(request) {
  const { productId, limit = 50 } = request.query;

  try {
    const logs = await base44.asServiceRole.entities.InventoryLog.filter({
      product_id: productId
    });

    return {
      success: true,
      logs: logs.slice(-limit).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}