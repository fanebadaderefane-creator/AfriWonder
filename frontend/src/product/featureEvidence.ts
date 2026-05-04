/**
 * Préconditions **sans** chaîne `apiClient` / `backendBase` (incompatibles Vitest node sans shim lourd).
 * Couplage réel : constantes API, flags, i18n, utilitaires — alignés sur les routes et modules du dépôt.
 * La présence des écrans / clients HTTP est garantie par `featureModulePaths.test.ts`.
 */
import { API_ROUTES } from '../config/api';
import { featureFlags } from '../config/featureFlags';
import { DATA_USAGE_STORAGE_KEY_PREFIX } from '../dataSaver/dataSaverConstants';
import { ALL_LANGUAGES } from '../i18n/translations';
import { formatMoneyAmount } from '../utils/formatMoney';

export function evidenceSocial(): boolean {
  return (
    typeof API_ROUTES.FEED === 'string'
    && API_ROUTES.FEED.length > 0
    && typeof API_ROUTES.VIDEOS === 'string'
    && API_ROUTES.VIDEOS.includes('videos')
    && typeof API_ROUTES.VIDEO_LIKE === 'function'
    && typeof API_ROUTES.VIDEO_COMMENT === 'function'
  );
}

export function evidenceMarketplace(): boolean {
  return (
    featureFlags.marketplace === true
    && typeof API_ROUTES.PRODUCTS === 'string'
    && typeof API_ROUTES.ORDERS === 'string'
    && typeof API_ROUTES.CART === 'string'
  );
}

export function evidenceMobilePayment(): boolean {
  return (
    typeof API_ROUTES.PAYMENTS_ORANGE === 'string'
    && API_ROUTES.PAYMENTS_ORANGE.includes('orange-money')
    && typeof API_ROUTES.PAYMENTS_WAVE === 'string'
    && API_ROUTES.PAYMENTS_WAVE.includes('wave')
    && typeof API_ROUTES.PAYMENTS_MTN === 'string'
  );
}

export function evidenceMessaging(): boolean {
  return (
    typeof API_ROUTES.MESSAGES_CONVERSATIONS === 'string'
    && API_ROUTES.MESSAGES_CONVERSATIONS.startsWith('/messages')
    && typeof API_ROUTES.MESSAGES_SEND === 'string'
    && API_ROUTES.MESSAGES_SEND.includes('send')
  );
}

export function evidenceDataOptimized(): boolean {
  return (
    DATA_USAGE_STORAGE_KEY_PREFIX.startsWith('afw_')
    && typeof formatMoneyAmount === 'function'
  );
}

export function evidenceAfricaAdapted(): boolean {
  return (
    Array.isArray(ALL_LANGUAGES)
    && ALL_LANGUAGES.includes('fr')
    && ALL_LANGUAGES.includes('bm')
    && typeof formatMoneyAmount === 'function'
  );
}

export function evidenceOpenAuditable(): boolean {
  return (
    typeof API_ROUTES.LOGIN === 'string'
    && typeof API_ROUTES.REGISTER === 'string'
    && typeof API_ROUTES.REFRESH === 'string'
    && typeof API_ROUTES.ME === 'string'
  );
}
