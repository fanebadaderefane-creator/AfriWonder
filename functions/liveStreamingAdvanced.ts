import { base44 } from "@base44/sdk";
import crypto from "crypto";

// Start advanced live stream
export async function startAdvancedLiveStream(request) {
  const { creatorId, title, description, category, isCostream, costreamerIds } = request.body;

  try {
    const roomId = crypto.randomBytes(16).toString("hex");
    const ingestUrl = `rtmps://ingest.afriwonder.app:443/live/${roomId}`;
    const streamKey = crypto.randomBytes(32).toString("hex");

    const liveStream = await base44.asServiceRole.entities.LiveStream.create({
      creator_id: creatorId,
      title,
      description,
      category,
      room_id: roomId,
      ingest_url: ingestUrl,
      stream_key: streamKey,
      is_costream: isCostream || false,
      costreamer_ids: costreamerIds || [],
      status: "live",
      viewers_count: 0,
      started_at: new Date().toISOString(),
      total_gifts_amount: 0,
      allow_comments: true,
      recording_url: null
    });

    // Créer la transcription automatique (WebRTC simulé)
    await base44.asServiceRole.entities.LiveTranscription.create({
      live_id: liveStream.id,
      language: "fr",
      content: "",
      status: "active"
    });

    return {
      success: true,
      liveStreamId: liveStream.id,
      ingestUrl,
      streamKey,
      playbackUrl: `https://cdn.afriwonder.app/live/${roomId}/index.m3u8`,
      message: "Live stream créé"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Record live stream
export async function recordLiveStream(request) {
  const { liveId } = request.body;

  try {
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ id: liveId });
    if (!liveStreams || liveStreams.length === 0) {
      return { success: false, error: "Live non trouvée" };
    }

    const liveStream = liveStreams[0];
    const recordingUrl = `https://cdn.afriwonder.app/recordings/${liveId}_${Date.now()}.mp4`;

    await base44.asServiceRole.entities.LiveStream.update(liveId, {
      recording_url: recordingUrl,
      is_recorded: true
    });

    // Créer une vidéo replay après le live
    await base44.asServiceRole.entities.Video.create({
      creator_id: liveStream.creator_id,
      title: `REPLAY: ${liveStream.title}`,
      description: liveStream.description,
      category: liveStream.category,
      video_url: recordingUrl,
      thumbnail_url: `https://cdn.afriwonder.app/live/${liveStream.room_id}/thumb.jpg`,
      duration_seconds: 0,
      visibility: "public",
      is_replay: true,
      original_live_id: liveId,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      recordingUrl,
      message: "Enregistrement démarré"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Enable co-streaming
export async function enableCoStreaming(request) {
  const { liveId, costreamerIds } = request.body;

  try {
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ id: liveId });
    if (!liveStreams || liveStreams.length === 0) {
      return { success: false, error: "Live non trouvée" };
    }

    await base44.asServiceRole.entities.LiveStream.update(liveId, {
      is_costream: true,
      costreamer_ids: costreamerIds || []
    });

    // Notifier les co-streamers
    for (const costreamer of costreamerIds || []) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: costreamer,
        type: "live",
        title: "Invitation co-diffusion",
        message: `Vous êtes invité à co-diffuser`,
        reference_type: "live",
        reference_id: liveId,
        is_read: false
      });
    }

    return {
      success: true,
      message: "Co-diffusion activée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Process live gift
export async function processLiveGift(request) {
  const { liveId, senderId, senderName, giftId, giftName, amount, quantity = 1 } = request.body;

  try {
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ id: liveId });
    if (!liveStreams || liveStreams.length === 0) {
      return { success: false, error: "Live non trouvée" };
    }

    const liveStream = liveStreams[0];
    const totalAmount = amount * quantity;
    const creatorEarnings = totalAmount * 0.9; // 90% to creator
    const platformCommission = totalAmount * 0.1; // 10% platform

    // Créer la transaction de cadeau
    const giftTransaction = await base44.asServiceRole.entities.LiveGift.create({
      live_id: liveId,
      sender_id: senderId,
      sender_name: senderName,
      creator_id: liveStream.creator_id,
      gift_id: giftId,
      gift_name: giftName,
      amount: totalAmount,
      quantity,
      creator_earnings: creatorEarnings,
      platform_commission: platformCommission,
      created_at: new Date().toISOString()
    });

    // Mettre à jour le total des cadeaux du live
    const newTotal = (liveStream.total_gifts_amount || 0) + totalAmount;
    await base44.asServiceRole.entities.LiveStream.update(liveId, {
      total_gifts_amount: newTotal
    });

    // Ajouter à la wallet du créateur
    const wallets = await base44.asServiceRole.entities.SellerWallet.filter({
      user_id: liveStream.creator_id
    });

    if (wallets && wallets.length > 0) {
      const newBalance = (wallets[0].balance || 0) + creatorEarnings;
      await base44.asServiceRole.entities.SellerWallet.update(wallets[0].id, {
        balance: newBalance
      });
    } else {
      await base44.asServiceRole.entities.SellerWallet.create({
        user_id: liveStream.creator_id,
        balance: creatorEarnings
      });
    }

    // Créer une notification
    await base44.asServiceRole.entities.Notification.create({
      user_id: liveStream.creator_id,
      type: "live",
      title: `Cadeau reçu: ${giftName}`,
      message: `${senderName} a envoyé ${quantity} ${giftName}`,
      reference_type: "live",
      reference_id: liveId,
      is_read: false
    });

    return {
      success: true,
      transactionId: giftTransaction.id,
      creatorEarnings,
      platformCommission,
      message: "Cadeau traité"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Add live subtitles
export async function addLiveSubtitles(request) {
  const { liveId, language, subtitles } = request.body;

  try {
    const subs = await base44.asServiceRole.entities.LiveSubtitle.create({
      live_id: liveId,
      language,
      content: subtitles,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      subtitleId: subs.id,
      message: "Sous-titres ajoutés"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get live analytics
export async function getLiveAnalytics(request) {
  const { liveId } = request.query;

  try {
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ id: liveId });
    if (!liveStreams || liveStreams.length === 0) {
      return { success: false, error: "Live non trouvée" };
    }

    const liveStream = liveStreams[0];
    const gifts = await base44.asServiceRole.entities.LiveGift.filter({ live_id: liveId });
    const comments = await base44.asServiceRole.entities.LiveChat.filter({ live_id: liveId });

    const duration = liveStream.ended_at 
      ? (new Date(liveStream.ended_at) - new Date(liveStream.started_at)) / 1000 / 60
      : 0;

    return {
      success: true,
      analytics: {
        duration: duration,
        peakViewers: liveStream.peak_viewers || 0,
        totalViewers: liveStream.viewers_count || 0,
        totalGifts: liveStream.total_gifts_amount || 0,
        totalComments: comments?.length || 0,
        totalTransactions: gifts?.length || 0,
        engagement: (liveStream.viewers_count || 0) > 0 
          ? ((comments?.length || 0) / (liveStream.viewers_count || 1) * 100).toFixed(2) 
          : 0
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}