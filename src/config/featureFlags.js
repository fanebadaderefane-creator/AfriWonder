/**
 * Feature flags — Configuration lancement 26 février
 * Modules Phase 2 cachés par défaut, réactivables en 1 clic via Admin.
 *
 * Valeurs par défaut si l'API ne répond pas (fallback offline).
 */
export const DEFAULT_FEATURE_FLAGS = {
  FEATURE_TRANSPORT: false,
  FEATURE_FOOD: false,
  FEATURE_TELEMEDECINE: false,
  FEATURE_REALESTATE: false,
  FEATURE_INSURANCE: false,
  FEATURE_UTILITIES: false,
  FEATURE_TICKETING: false,
  FEATURE_SERVICES: false,
  FEATURE_EDUCATION: false,
  FEATURE_JOBS: false,
  FEATURE_CIVIC: false,
  FEATURE_CROWDFUNDING: false,
  FEATURE_MICROCREDIT: false,
  FEATURE_NEWS: false,
  FEATURE_OFFLINE: false,
  FEATURE_QRCODE: false,
};

/** Mapping item menu (id) → feature flag (si absent = toujours visible) */
export const MENU_ITEM_TO_FLAG = {
  ticketing: 'FEATURE_TICKETING',
  transport: 'FEATURE_TRANSPORT',
  food: 'FEATURE_FOOD',
  utilities: 'FEATURE_UTILITIES',
  health: 'FEATURE_TELEMEDECINE',
  property: 'FEATURE_REALESTATE',
  insurance: 'FEATURE_INSURANCE',
  services: 'FEATURE_SERVICES',
  events: 'FEATURE_TICKETING',
  news: 'FEATURE_NEWS',
  courses: 'FEATURE_EDUCATION',
  'instructor-dashboard': 'FEATURE_EDUCATION',
  certificates: 'FEATURE_EDUCATION',
  microcredit: 'FEATURE_MICROCREDIT',
  crowdfunding: 'FEATURE_CROWDFUNDING',
  jobs: 'FEATURE_JOBS',
  civic: 'FEATURE_CIVIC',
  offline: 'FEATURE_OFFLINE',
  qrcode: 'FEATURE_QRCODE',
  'share-offline': 'FEATURE_OFFLINE',
  downloads: 'FEATURE_OFFLINE',
};
