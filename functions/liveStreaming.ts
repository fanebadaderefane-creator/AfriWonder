import { base44 } from "@base44/sdk";

// Initialize live stream
export async function initializeLiveStream(request) {
  const { creatorId, creatorName, title, description, category } = request.body;

  try {
    // Générer l'ID de la room WebRTC
    const roomId = `live_${creatorId}_${Date.now()}`;

    // Créer l'entrée live stream
    const liveStream = await base44.asServiceRole.entities.LiveStream.create({
      creator_id: creatorId,
      creator_name: creatorName,
      title,
      description,
      category,
      stream_url: `https://stream.afriwonder.app/${roomId}`,
      status: "live",
      viewers_count: 0,
      started_at: new Date().toISOString(),
      room_id: roomId
    });

    // Créer une notification pour les followers
    const followers = await base44.asServiceRole.entities.Follow.filter({
      following_id: creatorId
    });

    for (const follower of followers || []) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: follower.follower_id,
        type: "live",
        title: `${creatorName} est en direct`,
        message: title,
        from_user_id: creatorId,
        from_user_name: creatorName,
        reference_type: "live",
        reference_id: liveStream.id,
        action_url: `/live?streamId=${liveStream.id}`
      });
    }

    return {
      success: true,
      liveStream,
      roomId,
      streamUrl: `https://stream.afriwonder.app/${roomId}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Update live stream viewers
export async function updateLiveStreamViewers(request) {
  const { liveStreamId, viewersCount, peakViewers } = request.body;

  try {
    const update = { viewers_count: viewersCount };
    if (peakViewers) {
      update.peak_viewers = Math.max(peakViewers, viewersCount);
    }

    await base44.asServiceRole.entities.LiveStream.update(liveStreamId, update);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// End live stream
export async function endLiveStream(request) {
  const { liveStreamId } = request.body;

  try {
    const liveStream = await base44.asServiceRole.entities.LiveStream.filter({
      id: liveStreamId
    });

    if (!liveStream || liveStream.length === 0) {
      return { success: false, error: "Live stream not found" };
    }

    const stream = liveStream[0];
    const startTime = new Date(stream.started_at);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 60000); // en minutes

    await base44.asServiceRole.entities.LiveStream.update(liveStreamId, {
      status: "ended",
      ended_at: endTime.toISOString(),
      duration_minutes: duration
    });

    // Ajouter des points de gamification au créateur
    const userPoints = await base44.asServiceRole.entities.UserPoints.filter({
      user_id: stream.creator_id
    });

    const pointsEarned = Math.min(50 + (stream.viewers_count || 0) * 0.1, 500); // Max 500 points

    if (userPoints && userPoints.length > 0) {
      const newBalance = userPoints[0].points_balance + pointsEarned;
      await base44.asServiceRole.entities.UserPoints.update(userPoints[0].id, {
        points_balance: newBalance
      });
    } else {
      await base44.asServiceRole.entities.UserPoints.create({
        user_id: stream.creator_id,
        points_balance: pointsEarned
      });
    }

    return {
      success: true,
      duration,
      viewersCount: stream.viewers_count,
      pointsEarned
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process live gift
export async function processLiveGift(request) {
  const { liveStreamId, senderId, senderName, senderAvatar, giftId, giftName, giftIcon, amount, quantity = 1, creatorId, message } = request.body;

  try {
    const totalAmount = amount * quantity;
    const creatorEarnings = totalAmount * 0.9; // 90% pour le créateur
    const platformCommission = totalAmount * 0.1; // 10% pour la plateforme

    // Créer l'enregistrement du cadeau
    const giftTx = await base44.asServiceRole.entities.LiveGift.create({
      live_id: liveStreamId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      creator_id: creatorId,
      gift_id: giftId,
      gift_name: giftName,
      gift_icon: giftIcon,
      amount: totalAmount,
      quantity,
      total_amount: totalAmount,
      creator_earnings: creatorEarnings,
      platform_commission: platformCommission,
      message
    });

    // Créer la transaction
    await base44.asServiceRole.entities.Transaction.create({
      user_id: senderId,
      type: "live_gift",
      amount: totalAmount,
      currency: "XOF",
      status: "completed",
      description: `Cadeau ${giftName} x${quantity} pendant le live`
    });

    // Ajouter au portefeuille du créateur
    const creatorWallet = await base44.asServiceRole.entities.Wallet.filter({
      user_id: creatorId
    });

    if (creatorWallet && creatorWallet.length > 0) {
      const newBalance = creatorWallet[0].balance + creatorEarnings;
      await base44.asServiceRole.entities.Wallet.update(creatorWallet[0].id, {
        balance: newBalance
      });
    } else {
      await base44.asServiceRole.entities.Wallet.create({
        user_id: creatorId,
        balance: creatorEarnings,
        currency: "XOF"
      });
    }

    // Mettre à jour le total des cadeaux du live
    const stream = await base44.asServiceRole.entities.LiveStream.filter({
      id: liveStreamId
    });

    if (stream && stream.length > 0) {
      const newTotal = (stream[0].total_gifts_amount || 0) + totalAmount;
      await base44.asServiceRole.entities.LiveStream.update(liveStreamId, {
        total_gifts_amount: newTotal
      });
    }

    // Notification au créateur
    await base44.asServiceRole.entities.Notification.create({
      user_id: creatorId,
      type: "live",
      title: `${senderName} a envoyé un cadeau`,
      message: `${giftName} x${quantity} (+${creatorEarnings} FCFA)`,
      from_user_id: senderId,
      from_user_name: senderName,
      is_read: false
    });

    return {
      success: true,
      giftTransaction: giftTx,
      creatorEarnings,
      platformCommission
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Save live chat message
export async function saveLiveChat(request) {
  const { liveStreamId, senderId, senderName, senderAvatar, message, senderRole = "viewer" } = request.body;

  try {
    const chatMessage = await base44.asServiceRole.entities.LiveChat.create({
      live_id: liveStreamId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      sender_role: senderRole,
      message,
      message_type: "text"
    });

    return {
      success: true,
      chatMessage
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get live chat history
export async function getLiveChatHistory(request) {
  const { liveStreamId, limit = 50 } = request.query;

  try {
    const messages = await base44.asServiceRole.entities.LiveChat.filter({
      live_id: liveStreamId,
      is_deleted: false
    });

    return {
      success: true,
      messages: messages.slice(-limit).sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      )
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get featured lives
export async function getFeaturedLives(request) {
  try {
    const lives = await base44.asServiceRole.entities.LiveStream.filter({
      status: "live",
      is_featured: true
    });

    return {
      success: true,
      lives: lives.sort((a, b) => b.viewers_count - a.viewers_count).slice(0, 10)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}