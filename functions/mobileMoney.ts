/**
 * Mobile Money Payment Functions
 * Handles Orange Money, Wave, MTN Money, Moov Money integrations
 */

const axios = require('axios');

// Orange Money Configuration
const ORANGE_MONEY_CONFIG = {
  clientId: process.env.ORANGE_MONEY_CLIENT_ID,
  clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET,
  baseUrl: 'https://api.orange.com/orange-money-webpay/cm/v1', // Example for Cameroon
  notificationUrl: `${process.env.APP_URL}/webhooks/orange-money`
};

// Wave Configuration
const WAVE_CONFIG = {
  apiKey: process.env.WAVE_API_KEY,
  baseUrl: 'https://api.wave.com/v1',
  businessId: process.env.WAVE_BUSINESS_ID,
};

/**
 * Initialize Orange Money payment
 */
async function initOrangeMoneyPayment(userId, amount, description, reference) {
  try {
    // Get access token
    const tokenResponse = await axios.post(
      `${ORANGE_MONEY_CONFIG.baseUrl}/token`,
      {
        grant_type: 'client_credentials'
      },
      {
        auth: {
          username: ORANGE_MONEY_CONFIG.clientId,
          password: ORANGE_MONEY_CONFIG.clientSecret
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Create payment request
    const paymentResponse = await axios.post(
      `${ORANGE_MONEY_CONFIG.baseUrl}/webpay/pay`,
      {
        amount: Math.round(amount * 100) / 100, // Amount in local currency
        currency: 'XOF',
        orderReference: reference,
        notificationUrl: ORANGE_MONEY_CONFIG.notificationUrl,
        returnUrl: `${process.env.APP_URL}/payment-success?type=orange_money&reference=${reference}`,
        description: description,
        subscriberNumber: '' // User's phone number if available
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      paymentUrl: paymentResponse.data.paymentUrl,
      transactionId: paymentResponse.data.transactionId,
      provider: 'orange_money'
    };
  } catch (error) {
    console.error('Orange Money payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize Wave payment
 */
async function initWavePayment(userId, amount, description, reference) {
  try {
    const paymentResponse = await axios.post(
      `${WAVE_CONFIG.baseUrl}/transactions`,
      {
        type: 'PAYMENT',
        amount: {
          value: amount,
          currency: 'XOF'
        },
        description: description,
        externalId: reference,
        sourceType: 'MOBILE_MONEY',
        destinationId: WAVE_CONFIG.businessId,
        metadata: {
          userId: userId,
          reference: reference
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WAVE_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      paymentUrl: paymentResponse.data.checkoutUrl,
      transactionId: paymentResponse.data.id,
      provider: 'wave'
    };
  } catch (error) {
    console.error('Wave payment error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify Orange Money payment status
 */
async function verifyOrangeMoneyPayment(transactionId) {
  try {
    const tokenResponse = await axios.post(
      `${ORANGE_MONEY_CONFIG.baseUrl}/token`,
      { grant_type: 'client_credentials' },
      {
        auth: {
          username: ORANGE_MONEY_CONFIG.clientId,
          password: ORANGE_MONEY_CONFIG.clientSecret
        }
      }
    );

    const statusResponse = await axios.get(
      `${ORANGE_MONEY_CONFIG.baseUrl}/webpay/pay/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      }
    );

    return {
      success: statusResponse.data.status === 'SUCCESS',
      status: statusResponse.data.status,
      transactionId: transactionId
    };
  } catch (error) {
    console.error('Orange Money verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify Wave payment status
 */
async function verifyWavePayment(transactionId) {
  try {
    const statusResponse = await axios.get(
      `${WAVE_CONFIG.baseUrl}/transactions/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${WAVE_CONFIG.apiKey}`
        }
      }
    );

    return {
      success: statusResponse.data.status === 'COMPLETED',
      status: statusResponse.data.status,
      transactionId: transactionId
    };
  } catch (error) {
    console.error('Wave verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initOrangeMoneyPayment,
  initWavePayment,
  verifyOrangeMoneyPayment,
  verifyWavePayment
};