import { base44 } from "@base44/sdk";

// Create product review
export async function createProductReview(request) {
  const { productId, userId, rating, title, content, photos } = request.body;

  try {
    // Vérifier que l'utilisateur a acheté le produit
    const orders = await base44.asServiceRole.entities.Order.filter({
      user_id: userId
    });

    const hasPurchased = orders?.some(order =>
      order.items?.some(item => item.product_id === productId)
    );

    if (!hasPurchased) {
      return { success: false, error: "Seuls les acheteurs peuvent laisser des avis" };
    }

    // Créer l'avis
    const review = await base44.asServiceRole.entities.Review.create({
      product_id: productId,
      user_id: userId,
      rating: Math.min(5, Math.max(1, rating)),
      title,
      content,
      photos: photos || [],
      helpful_count: 0,
      status: "pending",
      verified_purchase: true,
      created_at: new Date().toISOString()
    });

    // Mettre à jour la note moyenne du produit
    await updateProductRating(productId);

    return {
      success: true,
      reviewId: review.id,
      message: "Avis soumis pour modération"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Update product rating
async function updateProductRating(productId) {
  try {
    const reviews = await base44.asServiceRole.entities.Review.filter({
      product_id: productId,
      status: "approved"
    });

    if (!reviews || reviews.length === 0) {
      return;
    }

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    await base44.asServiceRole.entities.Product.update(productId, {
      average_rating: parseFloat(avgRating.toFixed(2)),
      total_reviews: reviews.length,
      rating_distribution: ratingDistribution
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
  }
}

// Get product reviews
export async function getProductReviews(request) {
  const { productId, sortBy = "recent", limit = 20 } = request.query;

  try {
    let reviews = await base44.asServiceRole.entities.Review.filter({
      product_id: productId,
      status: "approved"
    });

    if (!reviews) {
      return { success: true, reviews: [] };
    }

    // Trier
    switch (sortBy) {
      case "helpful":
        reviews.sort((a, b) => b.helpful_count - a.helpful_count);
        break;
      case "rating_high":
        reviews.sort((a, b) => b.rating - a.rating);
        break;
      case "rating_low":
        reviews.sort((a, b) => a.rating - b.rating);
        break;
      case "recent":
      default:
        reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return {
      success: true,
      reviews: reviews.slice(0, limit),
      totalReviews: reviews.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Mark review as helpful
export async function markReviewHelpful(request) {
  const { reviewId } = request.body;

  try {
    const reviews = await base44.asServiceRole.entities.Review.filter({
      id: reviewId
    });

    if (!reviews || reviews.length === 0) {
      return { success: false, error: "Avis non trouvé" };
    }

    const review = reviews[0];
    const newCount = (review.helpful_count || 0) + 1;

    await base44.asServiceRole.entities.Review.update(reviewId, {
      helpful_count: newCount
    });

    return {
      success: true,
      helpfulCount: newCount
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Approve review (seller/admin)
export async function approveReview(request) {
  const { reviewId } = request.body;

  try {
    const reviews = await base44.asServiceRole.entities.Review.filter({
      id: reviewId
    });

    if (!reviews || reviews.length === 0) {
      return { success: false, error: "Avis non trouvé" };
    }

    await base44.asServiceRole.entities.Review.update(reviewId, {
      status: "approved"
    });

    // Mettre à jour la note du produit
    await updateProductRating(reviews[0].product_id);

    return {
      success: true,
      message: "Avis approuvé"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Reply to review
export async function replyToReview(request) {
  const { reviewId, replyContent, responderId } = request.body;

  try {
    const reviews = await base44.asServiceRole.entities.Review.filter({
      id: reviewId
    });

    if (!reviews || reviews.length === 0) {
      return { success: false, error: "Avis non trouvé" };
    }

    const reply = await base44.asServiceRole.entities.ReviewReply.create({
      review_id: reviewId,
      responder_id: responderId,
      content: replyContent,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      replyId: reply.id,
      message: "Réponse ajoutée"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}