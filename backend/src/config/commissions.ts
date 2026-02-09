/**
 * MODÈLE DE COMMISSIONS AFRIWONDER
 * Source unique pour tous les taux et frais par vertical.
 * Montants fixes en FCFA sauf indication (€/mois, etc.).
 */

export const COMMISSION_VERTICALS = {
  /** 1. VIDÉO SOCIAL (TikTok-style) */
  video_social: {
    tips_platform_pct: 0.30,           // 30% sur tips/cadeaux virtuels
    live_gift_creator_pct: 0.25,       // 25% créateur
    live_gift_platform_pct: 0.25,     // 25% plateforme (50% total partagé)
    ad_revenue_platform_pct: 1,        // 100% revenus pub
    creator_subscription_platform_pct: 0.20, // 20% (80% créateur)
  },

  /** 2. MARKETPLACE E-COMMERCE */
  marketplace: {
    seller_commission_min_pct: 0.08,   // 8%
    seller_commission_max_pct: 0.12,  // 12%
    seller_commission_default_pct: 0.10, // 10% par défaut
    listing_fee_fcfa: 0,              // Gratuit
    listing_premium_eur_per_month: 5,
    promotion_per_day_fcfa: 150,      // 50-200 FCFA/jour/produit (moyenne)
    flash_sale_platform_pct: 0.15,    // 15% commission
  },

  /** 3. SERVICES PROFESSIONNELS */
  services: {
    provider_commission_min_pct: 0.15,
    provider_commission_max_pct: 0.20,
    provider_commission_default_pct: 0.175, // 17.5%
    pro_subscription_eur_per_month: 10,
    qualified_lead_eur: 2,            // 1-3€ par contact
    local_ad_eur_per_month_min: 20,
    local_ad_eur_per_month_max: 100,
  },

  /** 4. TRANSPORT (VTC/Taxi) */
  transport: {
    ride_platform_pct: 0.225,         // 20-25% (22.5% défaut)
    cancellation_fee_min_fcfa: 500,
    cancellation_fee_max_fcfa: 1000,
    cancellation_platform_pct: 0.50, // 50% des frais annulation
    driver_subscription_eur_per_month: 5,
  },

  /** 5. LIVRAISON REPAS */
  food: {
    restaurant_commission_min_pct: 0.25,
    restaurant_commission_max_pct: 0.30,
    restaurant_commission_default_pct: 0.275, // 27.5%
    delivery_fee_min_fcfa: 500,
    delivery_fee_max_fcfa: 2000,
    delivery_driver_share_pct: 0.50,  // 50% au livreur
    restaurant_subscription_eur_per_month: 20,
    menu_boost_eur_per_month_min: 50,
    menu_boost_eur_per_month_max: 200,
  },

  /** 6. TÉLÉMÉDECINE */
  telemedicine: {
    consultation_platform_pct: 0.225,  // 20-25% (22.5%)
    doctor_subscription_eur_per_month: 15,
    pharmacy_commission_pct: 0.10,   // 10% sur ordonnances
    health_insurance_eur_per_user_per_year: 40, // 30-50€
  },

  /** 7. IMMOBILIER */
  property: {
    rental_commission_one_month: true, // 1 mois de loyer (partagé)
    platform_share_of_agent_commission_pct: 0.40, // 30-50% → 40%
    sale_commission_pct: 0.025,        // 2-3% prix vente
    agent_subscription_eur_per_month: 25,
    listing_boost_eur_per_month_min: 10,
    listing_boost_eur_per_month_max: 50,
  },

  /** 8. BILLETTERIE */
  ticketing: {
    ticket_platform_pct: 0.125,       // 10-15% (12.5%)
    service_fee_min_pct: 0.02,        // 2-5% payé par acheteur
    service_fee_max_pct: 0.05,
    service_fee_default_pct: 0.035,
    organizer_pro_subscription_eur_per_month: 30,
    event_promotion_eur_min: 50,
    event_promotion_eur_max: 500,
  },

  /** 9. PAIEMENT FACTURES */
  bills: {
    transaction_fee_min_pct: 0.01,
    transaction_fee_max_pct: 0.02,
    transaction_fee_default_pct: 0.015,
    operator_commission_pct: 0.0075, // 0.5-1% (électricité, eau)
    min_per_transaction_fcfa: 100,
    pro_subscription_eur_per_month: 10,
  },

  /** 10. RECHARGE CRÉDIT (Airtime) */
  airtime: {
    operator_commission_pct: 0.04,     // 3-5%
    user_cashback_pct: 0.015,         // 1-2%
    platform_net_margin_pct: 0.02,    // 1-3% marge nette
  },

  /** 11. ASSURANCE */
  insurance: {
    brokerage_commission_min_pct: 0.15,
    brokerage_commission_max_pct: 0.25,
    brokerage_commission_default_pct: 0.20,
    micro_insurance_commission_pct: 0.25, // 20-30%
    partner_fixed_eur_per_year_min: 5000,
    partner_fixed_eur_per_year_max: 20000,
    renewal_commission_pct: 0.15,    // commission sur renouvellement
  },

  /** 12. ACTUALITÉS/CONTENU */
  news: {
    display_ad_cpm_eur: 2,            // CPM 1-3€ (1000 vues)
    sponsored_article_eur_min: 50,
    sponsored_article_eur_max: 500,
    premium_subscription_eur_per_month: 3,
    branded_content_eur_min: 500,
    branded_content_eur_max: 5000,
  },
} as const;

export type CommissionVertical = keyof typeof COMMISSION_VERTICALS;
