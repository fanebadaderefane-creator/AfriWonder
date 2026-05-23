import { base44 } from "@base44/sdk";

// Stripe payment webhook handler
export async function handleStripeWebhook(request) {
  const event = request.body;

  try {
    switch (event.type) {
      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object);
        break;
      case "charge.failed":
        await handleChargeFailed(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
    }

    return { received: true };
  } catch (error) {
    console.error("Webhook error:", error);
    return { error: error.message };
  }
}

async function handleChargeSucceeded(charge) {
  const metadata = charge.metadata || {};
  const userId = metadata.user_id;
  const type = metadata.transaction_type; // gift, subscription, product

  // Créer la transaction
  const transaction = await base44.asServiceRole.entities.Transaction.create({
    user_id: userId,
    type: type,
    amount: charge.amount / 100, // Convertir de cents
    currency: charge.currency.toUpperCase(),
    status: "completed",
    payment_method: "stripe",
    stripe_charge_id: charge.id,
    description: metadata.description || "Paiement reçu"
  });

  // Mettre à jour le portefeuille utilisateur
  const wallet = await base44.asServiceRole.entities.Wallet.filter({ user_id: userId });
  
  if (wallet && wallet.length > 0) {
    const newBalance = wallet[0].balance + (charge.amount / 100);
    await base44.asServiceRole.entities.Wallet.update(wallet[0].id, {
      balance: newBalance
    });
  } else {
    await base44.asServiceRole.entities.Wallet.create({
      user_id: userId,
      balance: charge.amount / 100,
      currency: charge.currency.toUpperCase()
    });
  }

  // Envoyer notification
  await base44.asServiceRole.entities.Notification.create({
    user_id: userId,
    type: "payment",
    title: "Paiement reçu",
    message: `Paiement de ${charge.amount / 100} ${charge.currency.toUpperCase()} confirmé`,
    is_read: false
  });
}

async function handleChargeFailed(charge) {
  const metadata = charge.metadata || {};
  const userId = metadata.user_id;

  await base44.asServiceRole.entities.Transaction.create({
    user_id: userId,
    type: metadata.transaction_type,
    amount: charge.amount / 100,
    currency: charge.currency.toUpperCase(),
    status: "failed",
    payment_method: "stripe",
    stripe_charge_id: charge.id,
    description: charge.failure_message || "Paiement échoué"
  });

  await base44.asServiceRole.entities.Notification.create({
    user_id: userId,
    type: "payment",
    title: "Paiement échoué",
    message: `Votre paiement a échoué: ${charge.failure_message}`,
    is_read: false
  });
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;
  // Chercher l'utilisateur avec ce customer ID
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.stripe_customer_id === customerId);

  if (user) {
    await base44.asServiceRole.entities.Subscription.create({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      tier: subscription.metadata?.tier || "basic",
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000)
    });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  const users = await base44.asServiceRole.entities.User.list();
  const user = users.find(u => u.stripe_customer_id === customerId);

  if (user) {
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      stripe_subscription_id: subscription.id
    });
    if (subs && subs.length > 0) {
      await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
        status: "cancelled"
      });
    }
  }
}

// Process mobile money payment (Orange Money, Wave, MTN)
export async function processMobileMoneyPayment(request) {
  const { userId, amount, provider, phone, orderId, type } = request.body;

  try {
    // Créer une transaction en attente
    const transaction = await base44.asServiceRole.entities.Transaction.create({
      user_id: userId,
      type: type, // gift, subscription, product
      amount: amount,
      currency: "XOF",
      status: "pending",
      payment_method: provider, // orange_money, wave, mtn_money
      phone_number: phone,
      order_id: orderId
    });

    // Appeler l'API du fournisseur (implémentation mock)
    const paymentResult = await initiateMobileMoneyPayment({
      amount,
      phone,
      provider,
      transactionId: transaction.id,
      orderId
    });

    if (paymentResult.success) {
      await base44.asServiceRole.entities.Transaction.update(transaction.id, {
        status: "processing",
        provider_reference: paymentResult.reference
      });

      // Envoyer SMS de confirmation (mock)
      await sendSMSNotification({
        phone,
        message: `Vous avez une demande de paiement de ${amount} FCFA. Confirmez sur votre téléphone.`
      });

      return {
        success: true,
        transactionId: transaction.id,
        reference: paymentResult.reference,
        message: "Veuillez confirmer le paiement sur votre téléphone"
      };
    } else {
      await base44.asServiceRole.entities.Transaction.update(transaction.id, {
        status: "failed",
        error: paymentResult.error
      });

      return {
        success: false,
        error: paymentResult.error
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function initiateMobileMoneyPayment(data) {
  // Mock implementation - à remplacer par vraies APIs
  const { provider, amount, phone, transactionId } = data;

  // Simuler les appels API des fournisseurs
  const providers = {
    orange_money: {
      // API Orange Money Senegal
      endpoint: "https://api.orange.sn/payment/v1/initiate",
      apiKey: process.env.ORANGE_MONEY_API_KEY
    },
    wave: {
      // API Wave Senegal
      endpoint: "https://api.wave.com/v1/transactions",
      apiKey: process.env.WAVE_API_KEY
    },
    mtn_money: {
      // API MTN Money
      endpoint: "https://api.mtn.com/v1/payments",
      apiKey: process.env.MTN_MONEY_API_KEY
    }
  };

  const config = providers[provider];
  if (!config) {
    return { success: false, error: "Fournisseur non supporté" };
  }

  // Mock response
  return {
    success: true,
    reference: `${provider}_${Date.now()}`,
    message: "Paiement initié"
  };
}

async function sendSMSNotification(data) {
  // Utiliser un service SMS réel (Twilio, AWS SNS, etc.)
  console.log("SMS:", data.message, "to:", data.phone);
  // Mock - à remplacer par vraie implémentation
  return { success: true };
}

// Confirm mobile money payment
export async function confirmMobileMoneyPayment(request) {
  const { transactionId, code } = request.body;

  try {
    const transaction = await base44.asServiceRole.entities.Transaction.filter({
      id: transactionId
    });

    if (!transaction || transaction.length === 0) {
      return { success: false, error: "Transaction non trouvée" };
    }

    const tx = transaction[0];

    // Vérifier le code de confirmation (mock)
    if (code !== "123456") { // À remplacer par vraie vérification
      return { success: false, error: "Code invalide" };
    }

    // Marquer comme complète
    await base44.asServiceRole.entities.Transaction.update(transactionId, {
      status: "completed"
    });

    // Mettre à jour le portefeuille
    const wallet = await base44.asServiceRole.entities.Wallet.filter({
      user_id: tx.user_id
    });

    if (wallet && wallet.length > 0) {
      const newBalance = wallet[0].balance + tx.amount;
      await base44.asServiceRole.entities.Wallet.update(wallet[0].id, {
        balance: newBalance
      });
    }

    // Notification de succès
    await base44.asServiceRole.entities.Notification.create({
      user_id: tx.user_id,
      type: "payment",
      title: "Paiement confirmé",
      message: `Paiement de ${tx.amount} FCFA confirmé`,
      is_read: false
    });

    return {
      success: true,
      message: "Paiement confirmé",
      transactionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Get transaction history
export async function getTransactionHistory(request) {
  const { userId, limit = 20 } = request.query;

  try {
    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      user_id: userId
    });

    return {
      success: true,
      transactions: transactions.slice(0, limit).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}