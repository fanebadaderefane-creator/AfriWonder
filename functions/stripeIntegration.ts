import { base44 } from "@base44/sdk";

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create checkout session
export async function createCheckoutSession(request) {
  const { userId, userEmail, items, orderId, successUrl, cancelUrl } = request.body;

  try {
    // Formatter les items pour Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: "xof", // XOF pour Franc CFA Ouest
        product_data: {
          name: item.title || item.name,
          description: item.description,
          images: item.images ? [item.images[0]] : []
        },
        unit_amount: Math.round(item.price * 100) // Convertir en cents
      },
      quantity: item.quantity || 1
    }));

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: userEmail,
      metadata: {
        user_id: userId,
        order_id: orderId,
        transaction_type: "product_purchase"
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    // Sauvegarder la session de checkout
    await base44.asServiceRole.entities.CheckoutSession.create({
      user_id: userId,
      stripe_session_id: session.id,
      order_id: orderId,
      items: items,
      total_amount: items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0),
      payment_status: "pending",
      status_url: session.url,
      customer_email: userEmail
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Verify payment status
export async function verifyPaymentStatus(request) {
  const { sessionId } = request.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === "paid") {
      // Mettre à jour le CheckoutSession
      const checkoutSessions = await base44.asServiceRole.entities.CheckoutSession.filter({
        stripe_session_id: sessionId
      });

      if (checkoutSessions && checkoutSessions.length > 0) {
        const checkout = checkoutSessions[0];
        await base44.asServiceRole.entities.CheckoutSession.update(checkout.id, {
          payment_status: "succeeded"
        });

        // Créer la commande
        const order = await base44.asServiceRole.entities.Order.create({
          user_id: checkout.user_id,
          items: checkout.items,
          total_amount: checkout.total_amount,
          status: "pending",
          payment_method: "stripe",
          stripe_session_id: sessionId,
          shipping_address: session.shipping_details?.address
        });

        // Créer la transaction
        await base44.asServiceRole.entities.Transaction.create({
          user_id: checkout.user_id,
          type: "product_purchase",
          amount: checkout.total_amount,
          currency: "XOF",
          status: "completed",
          payment_method: "stripe",
          stripe_charge_id: session.payment_intent,
          description: `Commande #${order.id}`
        });

        return {
          success: true,
          status: "paid",
          orderId: order.id
        };
      }
    }

    return {
      success: true,
      status: session.payment_status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Handle subscription creation
export async function createSubscription(request) {
  const { userId, userEmail, tierId, tierName, priceId } = request.body;

  try {
    // Récupérer ou créer le customer Stripe
    let customer;
    const user = await base44.asServiceRole.entities.User.filter({ id: userId });

    if (user[0].stripe_customer_id) {
      customer = await stripe.customers.retrieve(user[0].stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId
        }
      });

      // Sauvegarder le customer ID
      await base44.asServiceRole.entities.User.update(userId, {
        stripe_customer_id: customer.id
      });
    }

    // Créer la souscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: priceId
        }
      ],
      metadata: {
        user_id: userId,
        tier_id: tierId,
        tier_name: tierName
      }
    });

    // Sauvegarder la souscription
    await base44.asServiceRole.entities.Subscription.create({
      user_id: userId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      tier: tierName,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000)
    });

    // Créer une notification
    await base44.asServiceRole.entities.Notification.create({
      user_id: userId,
      type: "subscription",
      title: "Abonnement activé",
      message: `Vous êtes maintenant abonné au tier ${tierName}`,
      is_read: false
    });

    return {
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Cancel subscription
export async function cancelSubscription(request) {
  const { subscriptionId } = request.body;

  try {
    const canceled = await stripe.subscriptions.del(subscriptionId);

    // Mettre à jour la souscription en base
    const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
      stripe_subscription_id: subscriptionId
    });

    if (subscriptions && subscriptions.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(subscriptions[0].id, {
        status: "cancelled"
      });
    }

    return {
      success: true,
      message: "Souscription annulée"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get subscription details
export async function getSubscriptionDetails(request) {
  const { subscriptionId } = request.query;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        items: subscription.items.data
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}