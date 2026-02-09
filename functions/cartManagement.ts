import { base44 } from "@base44/sdk";

// Get user cart
export async function getCart(request) {
  const { userId } = request.query;

  try {
    let cart = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });

    if (!cart || cart.length === 0) {
      cart = await base44.asServiceRole.entities.Cart.create({
        user_id: userId,
        items: [],
        subtotal: 0
      });
      return { success: true, cart };
    }

    return { success: true, cart: cart[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Add to cart
export async function addToCart(request) {
  const { userId, productId, quantity = 1 } = request.body;

  try {
    // Vérifier le stock
    const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    if (product.stock < quantity) {
      return { success: false, error: "Stock insuffisant" };
    }

    // Récupérer ou créer le panier
    let carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    let cart;

    if (!carts || carts.length === 0) {
      cart = await base44.asServiceRole.entities.Cart.create({
        user_id: userId,
        items: [],
        subtotal: 0
      });
    } else {
      cart = carts[0];
    }

    // Ajouter l'item
    const existingItem = cart.items?.find(item => item.product_id === productId);
    let updatedItems;

    if (existingItem) {
      existingItem.quantity += quantity;
      updatedItems = cart.items;
    } else {
      const newItem = {
        product_id: productId,
        product_name: product.title,
        product_image: product.images?.[0],
        seller_id: product.seller_id,
        seller_name: product.seller_name,
        price: product.price,
        quantity
      };
      updatedItems = [...(cart.items || []), newItem];
    }

    // Calculer le subtotal
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Mettre à jour le panier
    await base44.asServiceRole.entities.Cart.update(cart.id, {
      items: updatedItems,
      subtotal,
      last_updated: new Date().toISOString()
    });

    return {
      success: true,
      message: "Produit ajouté",
      cartItems: updatedItems.length,
      subtotal
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update cart item quantity
export async function updateCartItem(request) {
  const { userId, productId, quantity } = request.body;

  try {
    const carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    if (!carts || carts.length === 0) {
      return { success: false, error: "Panier non trouvé" };
    }

    const cart = carts[0];
    let updatedItems;

    if (quantity === 0) {
      updatedItems = cart.items.filter(item => item.product_id !== productId);
    } else {
      updatedItems = cart.items.map(item => 
        item.product_id === productId ? { ...item, quantity } : item
      );
    }

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await base44.asServiceRole.entities.Cart.update(cart.id, {
      items: updatedItems,
      subtotal,
      last_updated: new Date().toISOString()
    });

    return {
      success: true,
      items: updatedItems,
      subtotal
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Remove from cart
export async function removeFromCart(request) {
  const { userId, productId } = request.body;

  try {
    const carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    if (!carts || carts.length === 0) {
      return { success: false, error: "Panier non trouvé" };
    }

    const cart = carts[0];
    const updatedItems = cart.items.filter(item => item.product_id !== productId);
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await base44.asServiceRole.entities.Cart.update(cart.id, {
      items: updatedItems,
      subtotal,
      last_updated: new Date().toISOString()
    });

    return {
      success: true,
      items: updatedItems,
      subtotal
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Apply coupon
export async function applyCoupon(request) {
  const { userId, couponCode } = request.body;

  try {
    // Chercher le coupon
    const coupons = await base44.asServiceRole.entities.Coupon.filter({ code: couponCode });
    if (!coupons || coupons.length === 0) {
      return { success: false, error: "Coupon invalide" };
    }

    const coupon = coupons[0];
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);

    // Vérifier l'expiration
    if (now > expiresAt || coupon.is_used) {
      return { success: false, error: "Coupon expiré ou utilisé" };
    }

    // Vérifier l'utilisation max
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return { success: false, error: "Coupon épuisé" };
    }

    // Mettre à jour le panier
    const carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    if (carts && carts.length > 0) {
      const discount = carts[0].subtotal * (coupon.discount_percentage / 100);
      
      await base44.asServiceRole.entities.Cart.update(carts[0].id, {
        coupon_code: couponCode,
        coupon_discount: discount
      });
    }

    return {
      success: true,
      discountPercentage: coupon.discount_percentage,
      message: "Coupon appliqué"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Clear cart
export async function clearCart(request) {
  const { userId } = request.body;

  try {
    const carts = await base44.asServiceRole.entities.Cart.filter({ user_id: userId });
    if (carts && carts.length > 0) {
      await base44.asServiceRole.entities.Cart.update(carts[0].id, {
        items: [],
        subtotal: 0,
        coupon_code: null,
        coupon_discount: 0
      });
    }

    return { success: true, message: "Panier vidé" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}