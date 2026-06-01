import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type PlatformVersionPolicy = {
  min_version_code: number;
  latest_version_code: number;
  store_url: string;
};

export type AppVersionPolicyResponse = {
  android: PlatformVersionPolicy;
  ios: PlatformVersionPolicy;
};

export type AppUpdateKind = 'none' | 'soft' | 'force';

export type AppUpdateEvaluation = {
  kind: AppUpdateKind;
  storeUrl: string;
  latestVersionCode: number;
  minVersionCode: number;
  currentVersionCode: number;
};

/** Numéro de build natif courant (versionCode Android, buildNumber iOS). */
export function readNativeBuildNumber(platform: 'android' | 'ios'): number {
  if (platform === 'android') {
    const code = Constants.expoConfig?.android?.versionCode;
    return typeof code === 'number' && Number.isFinite(code) ? code : 0;
  }
  const raw = Constants.expoConfig?.ios?.buildNumber;
  const n = parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

export function resolvePlatformPolicy(
  payload: AppVersionPolicyResponse | null | undefined,
  platform: 'android' | 'ios',
): PlatformVersionPolicy | null {
  if (!payload) return null;
  const row = platform === 'android' ? payload.android : payload.ios;
  if (!row || row.latest_version_code <= 0) return null;
  return row;
}

/** Compare la build installée à la politique serveur. */
export function evaluateAppUpdate(
  platform: 'android' | 'ios',
  currentCode: number,
  policy: PlatformVersionPolicy | null,
): AppUpdateEvaluation {
  const storeUrl = policy?.store_url?.trim() || '';
  const latest = policy?.latest_version_code ?? 0;
  const min = policy?.min_version_code ?? 0;
  if (!policy || latest <= 0 || currentCode <= 0) {
    return {
      kind: 'none',
      storeUrl,
      latestVersionCode: latest,
      minVersionCode: min,
      currentVersionCode: currentCode,
    };
  }
  if (min > 0 && currentCode < min) {
    return {
      kind: 'force',
      storeUrl,
      latestVersionCode: latest,
      minVersionCode: min,
      currentVersionCode: currentCode,
    };
  }
  if (currentCode < latest) {
    return {
      kind: 'soft',
      storeUrl,
      latestVersionCode: latest,
      minVersionCode: min,
      currentVersionCode: currentCode,
    };
  }
  return {
    kind: 'none',
    storeUrl,
    latestVersionCode: latest,
    minVersionCode: min,
    currentVersionCode: currentCode,
  };
}

export function nativePlatformForUpdate(): 'android' | 'ios' | null {
  if (Platform.OS === 'android' || Platform.OS === 'ios') return Platform.OS;
  return null;
}
