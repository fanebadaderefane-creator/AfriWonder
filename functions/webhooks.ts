/**
 * Webhook handlers for mobile money and live streaming events
 */

/**
 * Handle Orange Money payment webhook
 */
async function handleOrangeMoneyWebhook(payload, base44) {
  try {
    const { transactionId, status, amount, orderReference } = payload;

    if (status === 'SUCCESS') {
      // Update transaction status
      const transaction = await base44.entities.Transaction.filter({
        reference_id: orderReference,
        payment_method: 'orange_money'
      });

      if (transaction?.[0]) {
        await base44.entities.Transaction.update(transaction[0].id, {
          status: 'completed',
          metadata: { externalTransactionId: transactionId }
        });

        // Add funds to wallet
        const wallet = await base44.entities.Wallet.filter({
          user_id: transaction[0].user_id
        });

        if (wallet?.[0]) {
          await base44.entities.Wallet.update(wallet[0].id, {
            balance: wallet[0].balance + amount,
            available_balance: wallet[0].available_balance + amount
          });
        }

        return { success: true };
      }
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      const transaction = await base44.entities.Transaction.filter({
        reference_id: orderReference,
        payment_method: 'orange_money'
      });

      if (transaction?.[0]) {
        await base44.entities.Transaction.update(transaction[0].id, {
          status: status === 'CANCELLED' ? 'cancelled' : 'failed'
        });
      }
    }

    return { success: true, status };
  } catch (error) {
    console.error('Orange Money webhook error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle Wave payment webhook
 */
async function handleWaveWebhook(payload, base44) {
  try {
    const { id, status, amount, metadata } = payload;

    if (status === 'COMPLETED') {
      const transaction = await base44.entities.Transaction.filter({
        reference_id: metadata.reference,
        payment_method: 'wave'
      });

      if (transaction?.[0]) {
        await base44.entities.Transaction.update(transaction[0].id, {
          status: 'completed',
          metadata: { externalTransactionId: id }
        });

        // Add funds to wallet
        const wallet = await base44.entities.Wallet.filter({
          user_id: metadata.userId
        });

        if (wallet?.[0]) {
          await base44.entities.Wallet.update(wallet[0].id, {
            balance: wallet[0].balance + amount.value,
            available_balance: wallet[0].available_balance + amount.value
          });
        }

        return { success: true };
      }
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      const transaction = await base44.entities.Transaction.filter({
        reference_id: metadata.reference,
        payment_method: 'wave'
      });

      if (transaction?.[0]) {
        await base44.entities.Transaction.update(transaction[0].id, {
          status: status === 'CANCELLED' ? 'cancelled' : 'failed'
        });
      }
    }

    return { success: true, status };
  } catch (error) {
    console.error('Wave webhook error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle Mux live stream events
 */
async function handleMuxLiveEvent(payload, base44) {
  try {
    const { type, data } = payload;

    switch (type) {
      case 'video.live_stream.started':
        // Update LiveStream status
        await base44.entities.LiveStream.update(data.id, {
          status: 'live',
          started_at: new Date().toISOString()
        });
        break;

      case 'video.live_stream.ended':
        // Update LiveStream status and calculate duration
        const stream = await base44.entities.LiveStream.filter({ id: data.id });
        if (stream?.[0]) {
          const duration = Math.round(
            (new Date() - new Date(stream[0].started_at)) / 60000
          );
          await base44.entities.LiveStream.update(data.id, {
            status: 'ended',
            ended_at: new Date().toISOString(),
            duration_minutes: duration
          });
        }
        break;

      case 'video.live_stream.updated':
        // Update viewer count or other metrics
        if (data.active_view_count !== undefined) {
          const stream = await base44.entities.LiveStream.filter({ id: data.id });
          if (stream?.[0] && data.active_view_count > stream[0].peak_viewers) {
            await base44.entities.LiveStream.update(data.id, {
              peak_viewers: data.active_view_count
            });
          }
        }
        break;
    }

    return { success: true };
  } catch (error) {
    console.error('Mux live event error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleOrangeMoneyWebhook,
  handleWaveWebhook,
  handleMuxLiveEvent
};