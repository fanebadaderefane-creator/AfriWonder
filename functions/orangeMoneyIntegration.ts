import { base44 } from "@base44/sdk";

const ORANGE_MONEY_API_URL = "https://api.orange.sn/payment/v1";
const ORANGE_CLIENT_ID = process.env.ORANGE_MONEY_CLIENT_ID;
const ORANGE_CLIENT_SECRET = process.env.ORANGE_MONEY_CLIENT_SECRET;

// Get OAuth token
async function getOrangeMoneyToken() {
  try {
    const response = await fetch(`${ORANGE_MONEY_API_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: ORANGE_CLIENT_ID,
        client_secret: ORANGE_CLIENT_SECRET
      })
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    throw new Error(`Orange Money token error: ${error.message}`);
  }
}

// Initiate Orange Money payment
export async function initiateOrangeMoneyPayment(request) {
  const { userId, amount, phoneNumber, orderId, callbackUrl } = request.body;

  try {
    const token = await getOrangeMoneyToken();

    // Créer une transaction en attente
    const transaction = await base44.asServiceRole.entities.Transaction.create({
      user_id: userId,
      type: "product_purchase",
      amount: amount,
      currency: "XOF",
      status: "pending",
      payment_method: "orange_money",
      phone_number: phoneNumber,
      order_id: orderId
    });

    // Appeler l'API Orange Money
    const response = await fetch(`${ORANGE_MONEY_API_URL}/payment/request`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount,
        currency: "XOF",
        merchant_reference: `ORDER_${orderId}`,
        subscriber_number: phoneNumber,
        description: `Achat AfriWonder #${orderId}`,
        callback_url: callbackUrl,
        return_url: `${process.env.APP_URL}/checkout/callback?transactionId=${transaction.id}`
      })
    });

    if (!response.ok) {
      throw new Error("Orange Money API error");
    }

    const data = await response.json();

    // Sauvegarder la référence du fournisseur
    await base44.asServiceRole.entities.Transaction.update(transaction.id, {
      provider_reference: data.order_id,
      status: "processing"
    });

    return {
      success: true,
      transactionId: transaction.id,
      reference: data.order_id,
      redirectUrl: data.redirect_url,
      message: "Veuillez compléter le paiement"
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Verify Orange Money payment
export async function verifyOrangeMoneyPayment(request) {
  const { referenceId } = request.query;

  try {
    const token = await getOrangeMoneyToken();

    // Vérifier le statut chez Orange Money
    const response = await fetch(
      `${ORANGE_MONEY_API_URL}/payment/status?order_id=${referenceId}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (data.status === "SUCCESS") {
      // Trouver et mettre à jour la transaction
      const transactions = await base44.asServiceRole.entities.Transaction.filter({
        provider_reference: referenceId
      });

      if (transactions && transactions.length > 0) {
        const tx = transactions[0];
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
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

        // Créer la commande
        const order = await base44.asServiceRole.entities.Order.create({
          user_id: tx.user_id,
          total_amount: tx.amount,
          status: "pending",
          payment_method: "orange_money",
          order_id: tx.order_id
        });

        return {
          success: true,
          status: "completed",
          orderId: order.id,
          amount: tx.amount
        };
      }
    }

    return {
      success: true,
      status: data.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Webhook handler for Orange Money
export async function handleOrangeMoneyWebhook(request) {
  const payload = request.body;
  const signature = request.headers["x-orange-signature"];

  try {
    // Vérifier la signature (à implémenter selon les specs Orange)
    // const isValid = verifyOrangeSignature(payload, signature);
    // if (!isValid) return { error: "Invalid signature" };

    const { order_id, status, amount } = payload;

    if (status === "SUCCESS") {
      // Trouver et mettre à jour la transaction
      const transactions = await base44.asServiceRole.entities.Transaction.filter({
        provider_reference: order_id
      });

      if (transactions && transactions.length > 0) {
        const tx = transactions[0];
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          status: "completed"
        });

        // Notification au client
        await base44.asServiceRole.entities.Notification.create({
          user_id: tx.user_id,
          type: "payment",
          title: "Paiement confirmé",
          message: `Paiement de ${amount} XOF reçu`,
          is_read: false
        });
      }
    } else if (status === "FAILED") {
      const transactions = await base44.asServiceRole.entities.Transaction.filter({
        provider_reference: order_id
      });

      if (transactions && transactions.length > 0) {
        const tx = transactions[0];
        await base44.asServiceRole.entities.Transaction.update(tx.id, {
          status: "failed"
        });

        await base44.asServiceRole.entities.Notification.create({
          user_id: tx.user_id,
          type: "payment",
          title: "Paiement échoué",
          message: "Votre paiement n'a pas pu être traité",
          is_read: false
        });
      }
    }

    return { received: true };
  } catch (error) {
    console.error("Orange Money webhook error:", error);
    return { error: error.message };
  }
}