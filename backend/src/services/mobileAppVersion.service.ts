/**
 * Politique de mise à jour mobile (Play Store / App Store).
 *
 * Sources (priorité) :
 * 1. `platformSettings` clé `mobile_app_update_policy` (admin PUT /api/admin/settings)
 * 2. Variables d'environnement Render (fallback ops)
 *
 * À chaque release APK : aligner `MOBILE_ANDROID_LATEST_VERSION_CODE` sur `app.json` android.versionCode.
 */

import prisma from '../config/database.js';

const ANDROID_PACKAGE = 'com.afriwonder.app';
const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

export const MOBILE_APP_UPDATE_POLICY_KEY = 'mobile_app_update_policy';

export const DEFAULT_SOFT_UPDATE_MESSAGE =
  "Une nouvelle version d'AfriWonder est disponible. Veuillez mettre à jour l'application pour bénéficier des dernières fonctionnalités et améliorations.";

export const DEFAULT_FORCE_UPDATE_MESSAGE =
  "Cette version d'AfriWonder n'est plus supportée. Veuillez mettre à jour l'application pour continuer.";

export type MobilePlatformVersionPolicy = {
  min_version_code: number;
  latest_version_code: number;
  store_url: string;
  update_message: string;
  force_update_message: string;
  use_play_in_app_update: boolean;
};

export type MobileAppVersionPayload = {
  android: MobilePlatformVersionPolicy;
  ios: MobilePlatformVersionPolicy;
};

export type StoredMobileAppUpdatePolicy = {
  android?: Partial<MobilePlatformVersionPolicy>;
  ios?: Partial<MobilePlatformVersionPolicy>;
};

function parsePositiveInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function readAndroidPolicyFromEnv(): MobilePlatformVersionPolicy {
  const latest = parsePositiveInt(process.env.MOBILE_ANDROID_LATEST_VERSION_CODE);
  const min = parsePositiveInt(process.env.MOBILE_ANDROID_MIN_VERSION_CODE);
  const storeUrl = String(process.env.MOBILE_ANDROID_STORE_URL || DEFAULT_PLAY_STORE_URL).trim();
  return {
    min_version_code: min ?? 0,
    latest_version_code: latest ?? 0,
    store_url: storeUrl || DEFAULT_PLAY_STORE_URL,
    update_message: DEFAULT_SOFT_UPDATE_MESSAGE,
    force_update_message: DEFAULT_FORCE_UPDATE_MESSAGE,
    use_play_in_app_update: true,
  };
}

function readIosPolicyFromEnv(): MobilePlatformVersionPolicy {
  const latest = parsePositiveInt(process.env.MOBILE_IOS_LATEST_BUILD_NUMBER);
  const min = parsePositiveInt(process.env.MOBILE_IOS_MIN_BUILD_NUMBER);
  const storeUrl = String(process.env.MOBILE_IOS_STORE_URL || '').trim();
  return {
    min_version_code: min ?? 0,
    latest_version_code: latest ?? 0,
    store_url: storeUrl,
    update_message: DEFAULT_SOFT_UPDATE_MESSAGE,
    force_update_message: DEFAULT_FORCE_UPDATE_MESSAGE,
    use_play_in_app_update: false,
  };
}

function mergePlatformPolicy(
  env: MobilePlatformVersionPolicy,
  stored?: Partial<MobilePlatformVersionPolicy> | null,
): MobilePlatformVersionPolicy {
  if (!stored || typeof stored !== 'object') return env;
  return {
    min_version_code: parsePositiveInt(stored.min_version_code) ?? env.min_version_code,
    latest_version_code: parsePositiveInt(stored.latest_version_code) ?? env.latest_version_code,
    store_url: String(stored.store_url ?? '').trim() || env.store_url,
    update_message: String(stored.update_message ?? '').trim() || env.update_message,
    force_update_message:
      String(stored.force_update_message ?? '').trim() || env.force_update_message,
    use_play_in_app_update:
      typeof stored.use_play_in_app_update === 'boolean'
        ? stored.use_play_in_app_update
        : env.use_play_in_app_update,
  };
}

async function readStoredPolicy(): Promise<StoredMobileAppUpdatePolicy | null> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { key: MOBILE_APP_UPDATE_POLICY_KEY },
    });
    const value = row?.value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as StoredMobileAppUpdatePolicy;
  } catch {
    return null;
  }
}

/** Politique effective (DB + env). */
export async function getMobileAppVersionPolicyAsync(): Promise<MobileAppVersionPayload> {
  const stored = await readStoredPolicy();
  return {
    android: mergePlatformPolicy(readAndroidPolicyFromEnv(), stored?.android),
    ios: mergePlatformPolicy(readIosPolicyFromEnv(), stored?.ios),
  };
}

/** Sync — env uniquement (tests unitaires sans DB). */
export function getMobileAppVersionPolicy(): MobileAppVersionPayload {
  return {
    android: readAndroidPolicyFromEnv(),
    ios: readIosPolicyFromEnv(),
  };
}

export function mergeMobileAppUpdatePolicyForTests(
  env: MobilePlatformVersionPolicy,
  stored?: Partial<MobilePlatformVersionPolicy> | null,
): MobilePlatformVersionPolicy {
  return mergePlatformPolicy(env, stored);
}

export async function saveMobileAppUpdatePolicy(
  patch: unknown,
): Promise<MobileAppVersionPayload> {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return getMobileAppVersionPolicyAsync();
  }
  const incoming = patch as StoredMobileAppUpdatePolicy;
  const current = (await readStoredPolicy()) ?? {};
  const merged: StoredMobileAppUpdatePolicy = {
    android: { ...current.android, ...incoming.android },
    ios: { ...current.ios, ...incoming.ios },
  };
  await prisma.platformSettings.upsert({
    where: { key: MOBILE_APP_UPDATE_POLICY_KEY },
    create: { key: MOBILE_APP_UPDATE_POLICY_KEY, value: merged },
    update: { value: merged },
  });
  return getMobileAppVersionPolicyAsync();
}
