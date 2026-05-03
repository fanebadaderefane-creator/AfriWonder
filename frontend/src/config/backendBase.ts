/* eslint-disable max-lines -- origine backend multi-plateforme (web / Android probe) ; refactor PR dédiée si besoin. */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { NativeModules, Platform } from 'react-native';
import { stripApiSuffix, stripTrailingSlash } from '../utils/urlNormalize';
import {
  isLikelyEphemeralDevBackendOrigin,
  orderedPrivateLanHostsFromStrings,
  preferLocalhostBackendWhenWebDevOnLocalhost,
} from './devBackendHostUtils';
import { unsafeBackendOriginReasonForNativeRelease } from './nativeReleaseBackendUrlSafety';
import { shouldHoldUiForAndroidDevBackendProbe } from './androidDevProbeUiPolicy';
import { applyAfriDeviceTrustToFetchInit } from '../utils/afwDeviceRequestId';

/**
 * Même défaut dev que la PWA (racine `.env.example`) : `VITE_API_URL=http://localhost:3000/api`.
 * Origine seulement (sans `/api`). En prod, définir `EXPO_PUBLIC_BACKEND_URL`.
 *
 * Résolution Android / émulateurs : voir `.cursor/rules/mobile-android-backend-url.mdc` — ne pas réordonner
 * packager vs `10.0.2.2` sans mise à jour des tests.
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://localhost:3000';

/**
 * Sentinelle retournée en production native quand `EXPO_PUBLIC_BACKEND_URL` est absent.
 * Volontairement invalide pour que les requêtes échouent **immédiatement** avec une erreur claire
 * au lieu de taper silencieusement `localhost:3000` (qui pointe vers l'appareil en prod et timeout).
 * Le TLD `.invalid` est réservé par la RFC 2606 et ne résoudra jamais.
 */
export const MISSING_BACKEND_URL_SENTINEL =
  'https://backend-url-not-configured.invalid';

let missingBackendUrlLogged = false;
let unsafeReleaseBackendUrlLogged = false;

function envTruth(raw: string | undefined): boolean {
  const v = (raw ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * Builds internes / staging VPN : autoriser une origine « non publique » explicitement.
 * À utiliser uniquement pour des APK non distribués sur le Play Store.
 */
function allowUnsafeBackendUrlOnNativeRelease(): boolean {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  return envTruth(
    process.env.EXPO_PUBLIC_ALLOW_UNSAFE_BACKEND_URL_ON_NATIVE_RELEASE
      ?? extra?.EXPO_PUBLIC_ALLOW_UNSAFE_BACKEND_URL_ON_NATIVE_RELEASE
  );
}

/**
 * Log une seule fois (console + Sentry) quand on détecte un build natif release
 * sans `EXPO_PUBLIC_BACKEND_URL`. Évite les logs répétés sur chaque appel API.
 */
function logMissingBackendUrlOnce(): void {
  if (missingBackendUrlLogged) return;
  missingBackendUrlLogged = true;
  const msg =
    '[AfriWonder] CRITICAL: EXPO_PUBLIC_BACKEND_URL is not set on this native production build. '
    + 'All API/socket calls will fail fast instead of hitting localhost. '
    + 'Configure EXPO_PUBLIC_BACKEND_URL in EAS secrets (e.g. https://api.afriwonder.com).';
  console.error(msg);
  try {
    // `require` synchrone : chargement optionnel Sentry sans cycle ESM (voir règle mobile Android URL).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../lib/sentryMobile') as {
      captureSentryMessage?: (m: string, l?: 'fatal' | 'error') => void;
    };
    mod.captureSentryMessage?.('missing_expo_public_backend_url', 'fatal');
  } catch {
    /* ignore */
  }
}

/**
 * APK release avec `EXPO_PUBLIC_BACKEND_URL` en LAN / localhost / HTTP : échec réseau garanti hors Wi‑Fi dev.
 * Retourne une sentinelle invalide + log critique (comme URL absente).
 */
function logUnsafeReleaseBackendUrlOnce(reason: string): void {
  if (unsafeReleaseBackendUrlLogged) return;
  unsafeReleaseBackendUrlLogged = true;
  const msg =
    `[AfriWonder] CRITICAL: EXPO_PUBLIC_BACKEND_URL is not suitable for this native production build (${reason}). `
    + 'Use a public HTTPS origin (e.g. https://api.example.com) in EAS env/secrets for Play Store builds. '
    + 'Optional escape hatch for internal APK only: EXPO_PUBLIC_ALLOW_UNSAFE_BACKEND_URL_ON_NATIVE_RELEASE=1.';
  console.error(msg);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../lib/sentryMobile') as {
      captureSentryMessage?: (m: string, l?: 'fatal' | 'error') => void;
    };
    mod.captureSentryMessage?.(`unsafe_expo_public_backend_url:${reason}`, 'fatal');
  } catch {
    /* ignore */
  }
}

/**
 * Hôtes LAN dérivés du packager Expo (`experienceUrl`, etc.) quand Metro annonce aussi `192.168.x.x`.
 * MEmu / certains profils : `hostUri` = 127.0.0.1 alors que `exp://192.168…` est la vraie IP du PC —
 * dans ce cas `10.0.2.2` peut échouer (bridge / NAT), l’IP LAN fonctionne.
 */
function packagerPrivateLanHostsOrdered(): string[] {
  const c = Constants as Record<string, unknown>;
  const strings: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) strings.push(v.trim());
  };
  /** Souvent `http://192.168.x.x:8081/.../index.bundle` alors que `hostUri` / `experienceUrl` = 127.0.0.1 (MEmu, adb reverse). */
  try {
    const scriptURL = (NativeModules as { SourceCode?: { scriptURL?: string } }).SourceCode?.scriptURL;
    add(scriptURL);
  } catch {
    /* ignore */
  }
  add(process.env.REACT_NATIVE_PACKAGER_HOSTNAME);
  /** Secours MEmu / adb reverse : tout est en 127.0.0.1 — mettre l’IP du PC (ex. `192.168.1.11`) dans `frontend/.env`. */
  add(process.env.EXPO_PUBLIC_DEV_PC_LAN_HOST);
  add(c.experienceUrl);
  add(c.linkingUri);
  const expoConfig = c.expoConfig as { hostUri?: string } | null | undefined;
  add(expoConfig?.hostUri);
  const egc = c.expoGoConfig as { debuggerHost?: string; developer?: string } | null | undefined;
  add(egc?.debuggerHost);
  add(egc?.developer);
  try {
    const m2 = (c.manifest2 ?? (c as { __unsafeNoWarnManifest2?: unknown }).__unsafeNoWarnManifest2) as
      | { extra?: { expoClient?: Record<string, unknown> } }
      | null
      | undefined;
    const ec = m2?.extra?.expoClient;
    if (ec && typeof ec === 'object') {
      add(ec.hostUri as string);
      add(ec.debuggerHost as string);
    }
  } catch {
    /* ignore */
  }

  return orderedPrivateLanHostsFromStrings(strings);
}

function androidDevBuildProfileBlob(): string {
  return [
    Device.brand,
    Device.manufacturer,
    Device.modelName,
    Device.designName,
    Device.productName,
    Device.deviceName,
    Device.osBuildFingerprint,
    Device.osInternalBuildId,
  ]
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ')
    .toLowerCase();
}

/**
 * Même quand `Device.isDevice` est true (MEmu / Nox imitent un téléphone), joindre l’API sur
 * l’IP LAN annoncée par Metro échoue souvent (NAT). Les alias vers le PC : `10.0.2.2` (AVD, MEmu…),
 * `10.0.3.2` (Genymotion).
 */
function androidDevEmulatorBackendOrigin(): string | null {
  if (Platform.OS !== 'android') return null;
  const blob = androidDevBuildProfileBlob();
  if (blob.includes('genymotion')) {
    return 'http://10.0.3.2:3000';
  }
  if (!Device.isDevice) {
    return 'http://10.0.2.2:3000';
  }
  const markers = [
    'memu',
    'nox',
    'bluestacks',
    'ldplayer',
    'gameloop',
    'sdk_gphone',
    'gphone64',
    'emulator',
    'ranchu',
    'goldfish',
    'vbox86',
    'vbox',
    'qemu',
    'generic_x86',
    'android_x86',
    'microvirt',
    'netease',
  ];
  if (markers.some((m) => blob.includes(m))) {
    return 'http://10.0.2.2:3000';
  }
  return null;
}

/** Sur l’émulateur Android, `localhost` / `127.0.0.1` pointent vers l’émulateur, pas la machine hôte. */
function androidDevHostForBackend(hostFromMetro: string): string {
  const h = hostFromMetro.trim().toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') {
    return '10.0.2.2';
  }
  return hostFromMetro.trim();
}

/**
 * Force `http://10.0.2.2:3000` (ou Genymotion) quand MEmu / Nox imitent un vrai téléphone et que
 * l’IP LAN de Metro ne route pas vers le PC. Définir `EXPO_PUBLIC_ANDROID_DEV_LOOPBACK=1` dans `.env`.
 */
function androidDevForcedEmulatorLoopbackOrigin(): string | null {
  if (Platform.OS !== 'android') return null;
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    process.env.EXPO_PUBLIC_ANDROID_DEV_LOOPBACK
    || extra?.EXPO_PUBLIC_ANDROID_DEV_LOOPBACK
    || ''
  )
    .trim()
    .toLowerCase();
  if (raw !== '1' && raw !== 'true' && raw !== 'yes') return null;
  const blob = androidDevBuildProfileBlob();
  if (blob.includes('genymotion')) {
    return 'http://10.0.3.2:3000';
  }
  return 'http://10.0.2.2:3000';
}

/** Dev : Metro fournit souvent `192.168.x.x:8082` — on réutilise l’hôte pour joindre l’API sur :3000. */
function computeNativeDevBackendOriginSync(): string {
  const forcedLoopback = androidDevForcedEmulatorLoopbackOrigin();
  if (forcedLoopback) {
    return forcedLoopback;
  }
  /**
   * Avant l’alias émulateur fixe : toute IP issue du packager (`scriptURL`, `EXPO_PUBLIC_DEV_PC_LAN_HOST`, …).
   * Sinon MEmu détecté → `10.0.2.2` court-circuitait et masquait une IP LAN réelle (bridge).
   */
  if (Platform.OS === 'android' && typeof __DEV__ !== 'undefined' && __DEV__) {
    const fromPackager = packagerPrivateLanHostsOrdered();
    if (fromPackager.length > 0) {
      return `http://${fromPackager[0]}:3000`;
    }
  }
  const emuOrigin = androidDevEmulatorBackendOrigin();
  if (emuOrigin) {
    return emuOrigin;
  }
  const hostUri = Constants.expoConfig?.hostUri?.trim();
  if (hostUri) {
    const rawHost = hostUri.split(':')[0];
    if (rawHost) {
      const hNorm = rawHost.trim().toLowerCase();
      const privateLans = packagerPrivateLanHostsOrdered();
      if (
        Platform.OS === 'android'
        && privateLans.length > 0
        && (hNorm === 'localhost' || hNorm === '127.0.0.1' || hNorm === '::1')
      ) {
        return `http://${privateLans[0]}:3000`;
      }
      const host =
        Platform.OS === 'android' ? androidDevHostForBackend(rawHost) : rawHost;
      return `http://${host}:3000`;
    }
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return DEFAULT_BACKEND_ORIGIN;
}

/** Après `probeAndroidDevBackendOrigin()` : origine qui répond à `/api/health`, ou `null` si on garde le sync. */
let androidDevOverrideOrigin: string | null = null;
let androidDevOverrideReady = false;

/**
 * MEmu / profil « téléphone réel » : l’IP LAN de Metro ne route pas, mais `10.0.2.2` oui.
 * Essaie les origines dans l’ordre ; garde la première qui répond (Android + __DEV__ uniquement).
 * Utilise `/health` (pas `/api/health`) pour éviter un 503 si la DB est « degraded » alors que l’API tourne.
 */
export async function probeAndroidDevBackendOrigin(): Promise<void> {
  if (Platform.OS !== 'android' || typeof __DEV__ === 'undefined' || !__DEV__) {
    androidDevOverrideReady = true;
    return;
  }
  const configured = readConfiguredOrigin();
  const mustProbe = !configured || isLikelyEphemeralDevBackendOrigin(configured);
  if (!mustProbe) {
    androidDevOverrideReady = true;
    return;
  }
  if (androidDevOverrideReady) return;

  const syncOrigin = stripTrailingSlash(computeNativeDevBackendOriginSync());
  const lanOrigins = packagerPrivateLanHostsOrdered().map((h) => `http://${h}:3000`);
  const rewrittenConfigured = configured
    ? stripTrailingSlash(rewriteLocalhostOriginForAndroidDev(configured))
    : '';
  /** LAN d’abord si Metro l’expose (MEmu + `hostUri` en 127.0.0.1), puis sync, `.env` réécrit, alias émulateur. */
  const candidates = [
    ...lanOrigins,
    syncOrigin,
    ...(rewrittenConfigured ? [rewrittenConfigured] : []),
    'http://10.0.2.2:3000',
    'http://10.0.3.2:3000',
  ];
  const seen = new Set<string>();
  const uniq = candidates.filter((o) => {
    const k = stripTrailingSlash(o);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  for (const raw of uniq) {
    const origin = stripTrailingSlash(raw);
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 4000);
      const res = await fetch(
        `${origin}/health`,
        applyAfriDeviceTrustToFetchInit({ method: 'GET', signal: ac.signal }),
      );
      clearTimeout(t);
      if (res.ok) {
        androidDevOverrideOrigin = stripApiSuffix(origin);
        androidDevOverrideReady = true;
        return;
      }
    } catch {
      /* essai suivant */
    }
  }
  androidDevOverrideOrigin = null;
  androidDevOverrideReady = true;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(
      '[AfriWonder] Backend injoignable depuis l’émulateur (probes :',
      uniq.join(', '),
      '). Lancez l’API sur le port 3000 (`cd backend` puis `npm run dev`), ouvrez le pare-feu Windows pour le port 3000, ou définissez EXPO_PUBLIC_BACKEND_URL ou EXPO_PUBLIC_DEV_PC_LAN_HOST (IP du PC).'
    );
  }
}

function readConfiguredOrigin(): string {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (
    extra?.EXPO_PUBLIC_BACKEND_URL
    || extra?.EXPO_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || ''
  ).trim();
  if (!raw) return '';
  return stripApiSuffix(raw);
}

/** `EXPO_PUBLIC_BACKEND_URL` renseignée (dev .env ou extra EAS) — le probe LAN Android n’est pas indispensable pour l’UI. */
export function hasExplicitBackendOriginConfigured(): boolean {
  return readConfiguredOrigin().length > 0;
}

/** Voir `androidDevProbeUiPolicy` — évite l’écran noir prolongé quand l’URL backend est déjà stable (HTTPS prod, etc.). */
export function shouldBlockUiUntilAndroidDevBackendProbe(): boolean {
  const configured = readConfiguredOrigin();
  const needsLanBackendProbe =
    !configured || isLikelyEphemeralDevBackendOrigin(configured);
  return shouldHoldUiForAndroidDevBackendProbe({
    platformOs: Platform.OS,
    isDev: typeof __DEV__ !== 'undefined' && !!__DEV__,
    needsLanBackendProbe,
  });
}

/**
 * `EXPO_PUBLIC_BACKEND_URL=http://localhost:3000` sur l’émulateur / appareil Android pointe vers
 * l’appareil lui-même, pas le PC — réécriture vers l’alias hôte (10.0.2.2, 10.0.3.2 Genymotion).
 */
function rewriteLocalhostOriginForAndroidDev(origin: string): string {
  if (Platform.OS !== 'android') return origin;
  if (typeof __DEV__ === 'undefined' || !__DEV__) return origin;
  let u: URL;
  try {
    u = new URL(origin);
  } catch {
    return origin;
  }
  const h = u.hostname.toLowerCase();
  if (h !== 'localhost' && h !== '127.0.0.1' && h !== '[::1]' && h !== '::1') {
    return origin;
  }
  /**
   * `localhost` forcé dans `.env` casse souvent Expo Go sur téléphone réel :
   * il faut d'abord tenter l'IP LAN du packager, puis seulement les alias émulateur.
   */
  const packagerHosts = packagerPrivateLanHostsOrdered();
  if (packagerHosts.length > 0) {
    u.hostname = packagerHosts[0];
    return stripApiSuffix(u.origin);
  }
  const special = androidDevEmulatorBackendOrigin();
  const replacementHost = special ? new URL(special).hostname : '10.0.2.2';
  u.hostname = replacementHost;
  return stripApiSuffix(u.origin);
}

/**
 * Origine du backend (schéma + hôte + port), sans slash final ni suffixe `/api`.
 *
 * - **Web en dev** (Expo sur :8081 / :8082) : sans variable, on pointe vers `localhost:3000`
 *   car il n’y a pas de proxy `/api` sur le serveur Metro.
 * - **Web en prod** : sans variable, chaîne vide = même origine que la page (si API derrière le même hôte).
 * - **iOS / Android en dev** : détails et ordre packager vs `10.0.2.2` → `.cursor/rules/mobile-android-backend-url.mdc`
 *   et `frontend/.env.example` (`EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_DEV_PC_LAN_HOST`, …).
 * - **Prod native** : sans variable → URL sentinelle invalide + log CRITIQUE (Sentry).
 *   Ne pas retomber silencieusement sur `localhost:3000` : c'est un piège qui fait croire à un bug
 *   backend alors que la variable d'env EAS manque.
 * - **Prod native avec URL « dev »** (HTTP, LAN, localhost, 127.0.0.1) → même sentinelle + log,
 *   sauf `EXPO_PUBLIC_ALLOW_UNSAFE_BACKEND_URL_ON_NATIVE_RELEASE=1` (APK internes uniquement).
 */
export function getBackendOrigin(): string {
  let configured = readConfiguredOrigin();
  if (
    configured
    && Platform.OS === 'web'
    && typeof __DEV__ !== 'undefined'
    && __DEV__
    && typeof window !== 'undefined'
  ) {
    configured = preferLocalhostBackendWhenWebDevOnLocalhost(
      configured,
      window.location?.hostname,
      DEFAULT_BACKEND_ORIGIN,
    );
  }
  if (configured) {
    const isNativeRelease =
      Platform.OS !== 'web'
      && (typeof __DEV__ === 'undefined' || !__DEV__);

    if (isNativeRelease && !allowUnsafeBackendUrlOnNativeRelease()) {
      const unsafeReason = unsafeBackendOriginReasonForNativeRelease(configured);
      if (unsafeReason) {
        logUnsafeReleaseBackendUrlOnce(unsafeReason);
        return MISSING_BACKEND_URL_SENTINEL;
      }
    }

    if (
      Platform.OS === 'android'
      && typeof __DEV__ !== 'undefined'
      && __DEV__
      && isLikelyEphemeralDevBackendOrigin(configured)
      && androidDevOverrideReady
      && androidDevOverrideOrigin !== null
    ) {
      return androidDevOverrideOrigin;
    }

    return rewriteLocalhostOriginForAndroidDev(configured);
  }

  if (Platform.OS === 'web') {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      return DEFAULT_BACKEND_ORIGIN;
    }
    return '';
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (
      Platform.OS === 'android'
      && androidDevOverrideReady
      && androidDevOverrideOrigin !== null
    ) {
      return androidDevOverrideOrigin;
    }
    return computeNativeDevBackendOriginSync();
  }

  logMissingBackendUrlOnce();
  return MISSING_BACKEND_URL_SENTINEL;
}
