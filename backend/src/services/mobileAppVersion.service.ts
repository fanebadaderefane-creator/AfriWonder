/**
 * Politique de mise à jour mobile (Play Store / App Store).
 * Configurer sur Render à chaque release :
 *   MOBILE_ANDROID_LATEST_VERSION_CODE (= app.json android.versionCode)
 *   MOBILE_ANDROID_MIN_VERSION_CODE (versions trop anciennes → MAJ obligatoire)
 */

const ANDROID_PACKAGE = 'com.afriwonder.app';
const DEFAULT_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type MobilePlatformVersionPolicy = {
  min_version_code: number;
  latest_version_code: number;
  store_url: string;
};

export type MobileAppVersionPayload = {
  android: MobilePlatformVersionPolicy;
  ios: MobilePlatformVersionPolicy;
};

function readAndroidPolicy(): MobilePlatformVersionPolicy {
  const latest = parsePositiveInt(process.env.MOBILE_ANDROID_LATEST_VERSION_CODE);
  const min = parsePositiveInt(process.env.MOBILE_ANDROID_MIN_VERSION_CODE);
  const storeUrl = String(process.env.MOBILE_ANDROID_STORE_URL || DEFAULT_PLAY_STORE_URL).trim();
  return {
    min_version_code: min ?? 0,
    latest_version_code: latest ?? 0,
    store_url: storeUrl || DEFAULT_PLAY_STORE_URL,
  };
}

function readIosPolicy(): MobilePlatformVersionPolicy {
  const latest = parsePositiveInt(process.env.MOBILE_IOS_LATEST_BUILD_NUMBER);
  const min = parsePositiveInt(process.env.MOBILE_IOS_MIN_BUILD_NUMBER);
  const storeUrl = String(process.env.MOBILE_IOS_STORE_URL || '').trim();
  return {
    min_version_code: min ?? 0,
    latest_version_code: latest ?? 0,
    store_url: storeUrl,
  };
}

export function getMobileAppVersionPolicy(): MobileAppVersionPayload {
  return {
    android: readAndroidPolicy(),
    ios: readIosPolicy(),
  };
}
