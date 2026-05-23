import { base44 } from "@base44/sdk";

// Generate AI product recommendations
export async function generateProductRecommendations(request) {
  const { userId, limit = 10 } = request.query;

  try {
    // Récupérer l'historique de l'utilisateur
    const userHistory = await base44.asServiceRole.entities.ViewHistory.filter({
      user_id: userId
    });

    const userLikes = await base44.asServiceRole.entities.Like.filter({
      user_id: userId
    });

    const userCart = await base44.asServiceRole.entities.Cart.filter({
      user_id: userId
    });

    // Analyser les préférences
    const categories = new Map();
    const priceRange = { min: Infinity, max: 0 };

    // Analyser les produits visionnés/aimés
    if (userHistory && userHistory.length > 0) {
      for (const view of userHistory.slice(-50)) {
        // Récupérer le produit
        const products = await base44.asServiceRole.entities.Product.filter({
          id: view.content_id
        });
        if (products && products.length > 0) {
          const p = products[0];
          categories.set(p.category, (categories.get(p.category) || 0) + 1);
          priceRange.min = Math.min(priceRange.min, p.price);
          priceRange.max = Math.max(priceRange.max, p.price);
        }
      }
    }

    // Récupérer les produits similaires
    let recommendedProducts = [];
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    if (topCategories.length > 0) {
      for (const category of topCategories) {
        const products = await base44.asServiceRole.entities.Product.filter({
          category
        });

        if (products && products.length > 0) {
          recommendedProducts.push(...products.filter(p => 
            p.price >= priceRange.min * 0.7 && p.price <= priceRange.max * 1.3
          ));
        }
      }
    }

    // Ajouter les produits tendances
    const trendingProducts = await base44.asServiceRole.entities.Product.filter({});
    const trending = trendingProducts
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, 5);

    recommendedProducts = [...recommendedProducts, ...trending];

    // Dédupliquer et limiter
    const unique = Array.from(new Map(
      recommendedProducts.map(p => [p.id, p])
    ).values());

    // Scorer les produits
    const scored = unique.map(p => ({
      ...p,
      score: calculateProductScore(p, categories, priceRange)
    }));

    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      success: true,
      recommendations,
      reason: "Basé sur votre historique et vos préférences"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Calculate product score
function calculateProductScore(product, categories, priceRange) {
  let score = 0;

  // Score basé sur la catégorie
  if (categories.has(product.category)) {
    score += categories.get(product.category) * 10;
  }

  // Score basé sur le prix
  if (priceRange.min !== Infinity && priceRange.max > 0) {
    const avgPrice = (priceRange.min + priceRange.max) / 2;
    const priceDiff = Math.abs(product.price - avgPrice);
    score += Math.max(0, 50 - priceDiff / 10);
  }

  // Score basé sur les ventes
  score += (product.sales_count || 0) * 0.5;

  // Score basé sur la notation
  score += (product.average_rating || 0) * 10;

  // Score basé sur le stock
  if (product.stock > 0) score += 5;

  return score;
}

// Get trending products
export async function getTrendingProducts(request) {
  const { category, limit = 20, timeframe = "week" } = request.query;

  try {
    let products = await base44.asServiceRole.entities.Product.filter({});

    if (category) {
      products = products.filter(p => p.category === category);
    }

    // Trier par popularité
    const trending = products
      .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
      .slice(0, limit);

    return {
      success: true,
      products: trending
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get related products
export async function getRelatedProducts(request) {
  const { productId, limit = 8 } = request.query;

  try {
    const products = await base44.asServiceRole.entities.Product.filter({
      id: productId
    });

    if (!products || products.length === 0) {
      return { success: false, error: "Produit non trouvé" };
    }

    const product = products[0];
    const allProducts = await base44.asServiceRole.entities.Product.filter({});

    // Trouver les produits similaires
    const related = allProducts
      .filter(p => 
        p.id !== productId &&
        (p.category === product.category || p.tags?.some(t => product.tags?.includes(t)))
      )
      .slice(0, limit);

    return {
      success: true,
      products: related
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get seasonal products
export async function getSeasonalProducts(request) {
  const { limit = 20 } = request.query;

  try {
    const allProducts = await base44.asServiceRole.entities.Product.filter({});
    const month = new Date().getMonth() + 1;

    // Définir les catégories saisonnières
    const seasonalCategories = {
      12: ["cadeaux", "décoration", "vêtements"],
      1: ["électronique", "fitness"],
      7: ["voyage", "plage"]
    };

    const season = seasonalCategories[month] || [];
    const seasonal = allProducts
      .filter(p => season.some(cat => p.category?.includes(cat)))
      .slice(0, limit);

    return {
      success: true,
      products: seasonal,
      season: month
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}