/**
 * CDC Marketplace Mali - Formules vendeurs
 */
export const SELLER_TIERS = {
  free: {
    id: 'free',
    label: 'Gratuit',
    priceFcfa: 0,
    maxProducts: 10,
    commissionPercent: 10,
    features: ['Support par email'],
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    priceFcfa: 10000,
    maxProducts: 100,
    commissionPercent: 7,
    features: ['Statistiques basiques', 'Badge boutique vérifiée'],
  },
  business: {
    id: 'business',
    label: 'Business',
    priceFcfa: 30000,
    maxProducts: -1,
    commissionPercent: 5,
    features: ['Produits illimités', 'Statistiques avancées', 'Mise en avant 3/semaine', 'Support prioritaire', 'API'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    priceFcfa: 50000,
    maxProducts: -1,
    commissionPercent: 3,
    features: ['Tous avantages Business', 'Account manager', 'Formation e-commerce'],
  },
};

export const getTierBySellerProfile = (sellerProfile) => {
  const tierId = sellerProfile?.subscription_tier || 'free';
  return SELLER_TIERS[tierId] || SELLER_TIERS.free;
};
