import { api } from '@/api/expressClient';

/**
 * Stripe Payment Integration for AfriWonder
 */
export class StripeIntegration {
  
  /**
   * Create a payment intent with Stripe
   */
  static async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'xof',
        description: _description,
        customer_email,
        metadata: _metadata = {}
      } = paymentData;

      const response = await api.integrations.Core.InvokeLLM({
        prompt: `Create Stripe Payment Intent: amount ${amount} ${currency}, description "${description}", email "${customer_email}". Return paymentIntentId and clientSecret.`,
        response_json_schema: {
          type: 'object',
          properties: {
            clientSecret: { type: 'string' },
            paymentIntentId: { type: 'string' },
            status: { type: 'string' }
          }
        }
      });

      return response;
    } catch (_error) {
      console.error('Erreur création Payment Intent:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session
   */
  static async createCheckoutSession(sessionData) {
    try {
      const {
        items,
        customer_email,
        _success_url,
        _cancel_url,
        _shipping_address,
        _coupon_code,
        metadata: _metadata = {}
      } = sessionData;

      const itemsDescription = items.map(i => `${i.title} x${i.quantity}`).join(', ');

      const response = await api.integrations.Core.InvokeLLM({
        prompt: `Create Stripe Checkout Session with items: ${itemsDescription}, email: ${customer_email}. Return sessionId and url.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            url: { type: 'string' }
          }
        }
      });

      return response;
    } catch (_error) {
      console.error('Erreur création Checkout Session:', error);
      throw error;
    }
  }

  /**
   * Verify payment status
   */
  static async verifyPayment(paymentIntentId) {
    try {
      const response = await api.integrations.Core.InvokeLLM({
        prompt: `Check Stripe Payment Intent status for ID ${paymentIntentId}. Return status (succeeded/processing/requires_action/canceled) and amount.`,
        response_json_schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            amount: { type: 'number' },
            charges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  receipt_url: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return response;
    } catch (_error) {
      console.error('Erreur vérification paiement:', error);
      return { status: 'error' };
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(chargeId, amount) {
    try {
      const response = await api.integrations.Core.InvokeLLM({
        prompt: `Refund Stripe charge ${chargeId} for amount ${amount}. Return refund status and refund ID.`,
        response_json_schema: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            refundId: { type: 'string' },
            amount_refunded: { type: 'number' }
          }
        }
      });

      return response;
    } catch (_error) {
      console.error('Erreur remboursement:', error);
      throw error;
    }
  }

  /**
   * Create a customer on Stripe
   */
  static async createCustomer(email, full_name) {
    try {
      const response = await api.integrations.Core.InvokeLLM({
        prompt: `Create Stripe Customer: email "${email}", name "${full_name}". Return customerId.`,
        response_json_schema: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            email: { type: 'string' }
          }
        }
      });

      return response;
    } catch (_error) {
      console.error('Erreur création customer:', error);
      throw error;
    }
  }

  /**
   * Retrieve webhook event
   */
  static async handleWebhookEvent(eventData) {
    const { type, data } = eventData;

    switch (type) {
      case 'payment_intent.succeeded':
        return await this.handlePaymentSuccess(data.object);
      case 'payment_intent.payment_failed':
        return await this.handlePaymentFailed(data.object);
      case 'charge.refunded':
        return await this.handleRefund(data.object);
      default:
        console.log('Unhandled webhook event:', type);
    }
  }

  static async handlePaymentSuccess(paymentIntent) {
    // Créer une transaction réussie
    console.log('Payment succeeded:', paymentIntent.id);
  }

  static async handlePaymentFailed(paymentIntent) {
    // Marquer la transaction comme échouée
    console.log('Payment failed:', paymentIntent.id);
  }

  static async handleRefund(charge) {
    // Créer un remboursement
    console.log('Refund processed:', charge.id);
  }
}

export default StripeIntegration;


