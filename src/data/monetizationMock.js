/**
 * Données fictives Monétisation Mini-Apps AfriWonder
 * Système de commission, abonnements et revenus
 */

// Plans d'abonnement développeur
export const DEVELOPER_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 0,
    priceDisplay: 'Gratuit',
    commission_rate: 0.10, // 10%
    features: [
      '1 mini-app',
      'Commission standard 10%',
      'Analytics basique',
      'Support email',
      'API standard',
    ],
    limits: {
      max_apps: 1,
      max_transactions_per_month: 1000,
      analytics_retention_days: 30,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15000, // 15 000 FCFA / mois
    priceDisplay: '15 000 FCFA/mois',
    commission_rate: 0.08, // 8% (réduit)
    features: [
      'Mini-apps illimitées',
      'Commission réduite 8%',
      'Analytics avancé',
      'Support prioritaire',
      'API avancée',
      'Branding personnalisé',
      'Retrait quotidien',
    ],
    limits: {
      max_apps: -1, // Illimité
      max_transactions_per_month: -1, // Illimité
      analytics_retention_days: 365,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 50000, // 50 000 FCFA / mois
    priceDisplay: '50 000 FCFA/mois',
    commission_rate: 0.05, // 5% (négocié)
    features: [
      'Mini-apps illimitées',
      'Commission négociée 5%',
      'Analytics premium',
      'SLA garanti',
      'Hébergement dédié',
      'Support dédié',
      'Retrait instantané',
      'API personnalisée',
    ],
    limits: {
      max_apps: -1,
      max_transactions_per_month: -1,
      analytics_retention_days: -1, // Illimité
    },
  },
};

// Catégories avec taux de commission spécifiques
export const COMMISSION_RATES = {
  commerce: 0.10, // 10%
  marketplace: 0.12, // 12%
  services: 0.10, // 10%
  transport: 0.15, // 15%
  education: 0.05, // 5%
  sante: 0.08, // 8%
  finance: 0.05, // 5%
  social: 0.05, // 5% (ONG)
  agriculture: 0.08, // 8%
  travel: 0.12, // 12%
  default: 0.10, // 10% par défaut
};

// Options de Boost
export const BOOST_OPTIONS = {
  featured: {
    id: 'featured',
    name: 'Mise en vedette',
    description: 'Apparaître dans la section "En vedette"',
    duration_days: 7,
    price: 25000, // 25 000 FCFA / semaine
    priceDisplay: '25 000 FCFA/semaine',
  },
  top_trending: {
    id: 'top_trending',
    name: 'Top Tendances',
    description: 'Apparaître en haut de la section Tendances',
    duration_days: 7,
    price: 20000, // 20 000 FCFA / semaine
    priceDisplay: '20 000 FCFA/semaine',
  },
  push_notification: {
    id: 'push_notification',
    name: 'Notification Push',
    description: 'Notification sponsorisée à tous les utilisateurs',
    price_per_1000: 5000, // 5 000 FCFA pour 1000 notifications
    priceDisplay: '5 000 FCFA/1000',
  },
  search_boost: {
    id: 'search_boost',
    name: 'Boost Recherche',
    description: 'Apparaître en premier dans les résultats de recherche',
    duration_days: 30,
    price: 30000, // 30 000 FCFA / mois
    priceDisplay: '30 000 FCFA/mois',
  },
};

// Frais techniques
export const TECHNICAL_FEES = {
  developer_activation: 25000, // 25 000 FCFA unique
  kyc_verification: 0, // Gratuit pour encourager
  withdrawal_fee: 500, // 500 FCFA par retrait
  withdrawal_minimum: 5000, // Minimum 5 000 FCFA pour retirer
};

// Revenus mockés pour démo
export const MOCK_REVENUE_DATA = {
  total_gmv: 40000000, // 40M FCFA GMV total
  platform_commission: 3200000, // 3.2M FCFA commission plateforme
  developer_earnings: 36800000, // 36.8M FCFA revenus développeurs
  active_apps: 200,
  average_commission_rate: 0.08, // 8%
  transactions_count: 1250,
  top_earning_apps: [
    {
      app_id: 'mini-app-8',
      app_name: 'Banque Mobile Mali',
      gmv: 5000000,
      commission: 400000,
      developer_earnings: 4600000,
    },
    {
      app_id: 'mini-app-1',
      app_name: 'Taxi Mali Express',
      gmv: 3500000,
      commission: 525000,
      developer_earnings: 2975000,
    },
    {
      app_id: 'mini-app-6',
      app_name: 'Boutique WhatsApp Pro',
      gmv: 2800000,
      commission: 280000,
      developer_earnings: 2520000,
    },
  ],
};

// Historique de transactions mocké
export const MOCK_TRANSACTIONS = [
  {
    id: 'txn-1',
    app_id: 'mini-app-8',
    app_name: 'Banque Mobile Mali',
    amount: 50000,
    commission_rate: 0.05,
    commission_amount: 2500,
    developer_amount: 47500,
    status: 'completed',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-123',
  },
  {
    id: 'txn-2',
    app_id: 'mini-app-1',
    app_name: 'Taxi Mali Express',
    amount: 2500,
    commission_rate: 0.15,
    commission_amount: 375,
    developer_amount: 2125,
    status: 'completed',
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-456',
  },
  {
    id: 'txn-3',
    app_id: 'mini-app-6',
    app_name: 'Boutique WhatsApp Pro',
    amount: 15000,
    commission_rate: 0.10,
    commission_amount: 1500,
    developer_amount: 13500,
    status: 'completed',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-789',
  },
];
