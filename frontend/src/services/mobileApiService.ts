import mobileApiClient from '../api/mobileClient';

export type MobileDeviceSettings = {
  id?: string;
  data_saver_mode?: boolean;
  preferred_language?: string | null;
  timezone?: string | null;
  theme?: string | null;
  preferred_categories?: string[] | null;
  messaging_e2e_enabled?: boolean;
  messaging_read_receipts_enabled?: boolean;
  messaging_cdc_moderation?: Record<string, unknown> | null;
  storage?: string;
};

export async function registerMobilePushToken(token: string, platform: string) {
  const res = await mobileApiClient.post('/mobile/push-token', { token, platform });
  return res.data?.data ?? res.data;
}

export async function getMobileDeviceSettings(): Promise<MobileDeviceSettings> {
  const res = await mobileApiClient.get('/mobile/device-settings');
  return (res.data?.data ?? res.data) as MobileDeviceSettings;
}

export async function updateMobileDeviceSettings(payload: Partial<MobileDeviceSettings>): Promise<MobileDeviceSettings> {
  const res = await mobileApiClient.put('/mobile/device-settings', payload);
  return (res.data?.data ?? res.data) as MobileDeviceSettings;
}

export async function getMobileVideoDownloadUrl(videoId: string): Promise<string | null> {
  const res = await mobileApiClient.get(`/mobile/videos/${encodeURIComponent(videoId)}/download-url`);
  const data = res.data?.data ?? res.data;
  return typeof data?.download_url === 'string' ? data.download_url : null;
}

export async function resolveMobileDeepLink(url: string): Promise<{
  entity_type: string;
  entity_id: string;
  route: string;
  exists: boolean;
} | null> {
  const res = await mobileApiClient.get('/mobile/resolve-deeplink', { params: { url } });
  return (res.data?.data ?? res.data) || null;
}

export async function trackMobileAnalyticsEvent(payload: {
  eventType: string;
  entityType: string;
  entityId: string;
  metricValue?: number;
  metadata?: Record<string, unknown>;
}) {
  const res = await mobileApiClient.post('/mobile/analytics/event', {
    eventType: payload.eventType,
    entityType: payload.entityType,
    entityId: payload.entityId,
    metricValue: payload.metricValue ?? 1,
    metadata: payload.metadata ?? {},
  });
  return res.data?.data ?? res.data;
}

export async function getCoinsBalance(): Promise<{ coins_balance: number; pending_coins?: number }> {
  const res = await mobileApiClient.get('/coins/balance');
  return (res.data?.data ?? res.data) as { coins_balance: number; pending_coins?: number };
}

export async function getCoinPackages(): Promise<{
  packages: { id: string; name: string; coins_amount: number; price_fcfa: number; bonus_coins: number; is_popular: boolean }[];
}> {
  const res = await mobileApiClient.get('/coins/packages');
  return (res.data?.data ?? res.data) as {
    packages: { id: string; name: string; coins_amount: number; price_fcfa: number; bonus_coins: number; is_popular: boolean }[];
  };
}

export async function initiateCoinsPurchase(payload: {
  packageId: string;
  payment_method?: 'orange_money' | 'wave';
  phone?: string;
  returnUrl?: string;
}) {
  const res = await mobileApiClient.post('/coins/purchase', payload);
  return res.data?.data ?? res.data;
}

export async function getCoinsPurchaseStatus(referenceId: string) {
  const res = await mobileApiClient.get(`/coins/purchase/status/${encodeURIComponent(referenceId)}`);
  return res.data?.data ?? res.data;
}

export async function confirmCoinsPurchase(referenceId: string) {
  const res = await mobileApiClient.post('/coins/purchase/confirm', { referenceId });
  return res.data?.data ?? res.data;
}

export async function getCoinsHistory(page: number = 1, limit: number = 20) {
  const res = await mobileApiClient.get('/coins/history', { params: { page, limit } });
  return res.data?.data ?? res.data;
}

export async function claimDailyCoinsMission(): Promise<{
  coins_granted?: number;
  coins_balance?: number;
}> {
  const res = await mobileApiClient.post('/coins/missions/daily-coins');
  return (res.data?.data ?? res.data) as { coins_granted?: number; coins_balance?: number };
}

export async function creditIapCoinPurchase(payload: {
  transaction_id: string;
  platform: 'ios' | 'android';
  package_id: string;
}): Promise<{
  already_credited?: boolean;
  coins_credited?: number;
  coins_balance?: number;
}> {
  const res = await mobileApiClient.post('/coins/iap/credit', payload);
  return (res.data?.data ?? res.data) as {
    already_credited?: boolean;
    coins_credited?: number;
    coins_balance?: number;
  };
}
