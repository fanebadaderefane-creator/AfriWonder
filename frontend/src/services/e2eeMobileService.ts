/**
 * Bootstrap messagerie E2EE (même contrat que la PWA `e2eeClient.js`) pour le client Expo.
 * API : `/api/proxy/e2ee/*` (voir `backend/src/app.ts`).
 *
 * Stockage : `expo-secure-store` / AsyncStorage (web) via `secureStorage`.
 * WebCrypto : polyfill `@peculiar/webcrypto` si `crypto.subtle` absent (Hermes).
 */

import '../polyfills';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import apiClient from '../api/client';
import { secureStorage } from '../utils/secureStorage';

const E2EE_DEVICE_ID_KEY = 'aw_m_e2ee_device_id_v1';
const E2EE_PRIVATE_KEY_KEY = 'aw_m_e2ee_private_pkcs8_v1';
const E2EE_PUBLIC_KEY_KEY = 'aw_m_e2ee_public_spki_v1';
const E2EE_REGISTERED_USER_KEY = 'aw_m_e2ee_registered_v1';
const E2EE_PREKEY_COUNTER_KEY = 'aw_m_e2ee_prekey_ctr_v1';
const E2EE_PREKEYS_PRIVATE_KEY = 'aw_m_e2ee_prekeys_priv_v1';
const E2EE_LAST_ROTATE_KEY = 'aw_m_e2ee_last_rotate_v1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let cryptoReady = false;
const bootstrapInflight = new Map<string, Promise<{ deviceId: string; identityPublicKey: string } | null>>();

/**
 * `@peculiar/webcrypto` charge `react-native-quick-crypto` au parse du bundle : si le module
 * natif `QuickCrypto` n’est pas présent (Expo Go, build sans prebuild), l’erreur est synchrone
 * et ne doit jamais être déclenchée — on vérifie avant tout `import()`.
 */
let peculiarInitPromise: Promise<boolean> | null = null;

function canLoadPeculiarWebCrypto(): boolean {
  if (Platform.OS === 'web') return true;
  try {
    return NativeModules.QuickCrypto != null;
  } catch {
    return false;
  }
}

async function initWebCryptoIfNeeded(): Promise<boolean> {
  if (cryptoReady) return true;
  const g = globalThis as unknown as { crypto?: Crypto };
  if (g.crypto?.subtle && typeof g.crypto.getRandomValues === 'function') {
    cryptoReady = true;
    return true;
  }
  if (!canLoadPeculiarWebCrypto()) {
    return false;
  }
  if (!peculiarInitPromise) {
    peculiarInitPromise = import('@peculiar/webcrypto')
      .then((mod) => {
        const CryptoCtor = mod.Crypto;
        (globalThis as unknown as { crypto?: Crypto }).crypto = new CryptoCtor() as Crypto;
        cryptoReady = true;
        return true;
      })
      .catch(() => {
        peculiarInitPromise = null;
        return false;
      });
  }
  return peculiarInitPromise;
}

async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await secureStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setJSON(key: string, value: unknown) {
  await secureStorage.setItem(key, JSON.stringify(value));
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < arr.length; i += chunk) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(String(b64 || ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await secureStorage.getItem(E2EE_DEVICE_ID_KEY);
  if (existing) return existing;
  const buf = new Uint8Array(16);
  globalThis.crypto.getRandomValues(buf);
  const id = [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
  const generated = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-mobi-${Date.now().toString(36)}`;
  await secureStorage.setItem(E2EE_DEVICE_ID_KEY, generated);
  return generated;
}

async function exportPublicSpkiBase64(keyPair: CryptoKeyPair): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return toBase64(new Uint8Array(spki));
}

async function exportPrivatePkcs8Base64(keyPair: CryptoKeyPair): Promise<string> {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  return toBase64(new Uint8Array(pkcs8));
}

async function importPrivateKeyFromBase64(pkcs8B64: string): Promise<CryptoKey> {
  const bytes = fromBase64(pkcs8B64);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return crypto.subtle.importKey('pkcs8', buffer, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
}

async function getOrCreateIdentityKeypair(): Promise<{ publicB64: string; privateKey: CryptoKey }> {
  const publicB64 = await secureStorage.getItem(E2EE_PUBLIC_KEY_KEY);
  const privateB64 = await secureStorage.getItem(E2EE_PRIVATE_KEY_KEY);
  if (publicB64 && privateB64) {
    const privateKey = await importPrivateKeyFromBase64(privateB64);
    return { publicB64, privateKey };
  }
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )) as CryptoKeyPair;
  const exportedPublic = await exportPublicSpkiBase64(keyPair);
  const exportedPrivate = await exportPrivatePkcs8Base64(keyPair);
  await secureStorage.setItem(E2EE_PUBLIC_KEY_KEY, exportedPublic);
  await secureStorage.setItem(E2EE_PRIVATE_KEY_KEY, exportedPrivate);
  return { publicB64: exportedPublic, privateKey: keyPair.privateKey };
}

async function generateAndUploadPrekeys(deviceId: string, count = 10): Promise<void> {
  let start = Number((await secureStorage.getItem(E2EE_PREKEY_COUNTER_KEY)) || 1);
  if (!Number.isFinite(start) || start < 1) start = 1;
  const privateMap = await getJSON<Record<string, string>>(E2EE_PREKEYS_PRIVATE_KEY, {});
  const rows: { keyId: number; publicKey: string }[] = [];
  let cursor = start;
  for (let i = 0; i < count; i += 1) {
    const kp = (await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    )) as CryptoKeyPair;
    const pub = await exportPublicSpkiBase64(kp);
    const priv = await exportPrivatePkcs8Base64(kp);
    const keyId = cursor++;
    rows.push({ keyId, publicKey: pub });
    privateMap[String(keyId)] = priv;
  }
  await apiClient.post('/e2ee/prekeys/upload', { deviceId, prekeys: rows });
  await setJSON(E2EE_PREKEYS_PRIVATE_KEY, privateMap);
  await secureStorage.setItem(E2EE_PREKEY_COUNTER_KEY, String(cursor));
}

async function registerDeviceAndUploadPrekeys(userId: string, deviceId: string, publicB64: string): Promise<void> {
  const platform = `${Platform.OS}`.slice(0, 64);
  await apiClient.post('/e2ee/devices/register', {
    deviceId,
    identityKeyPublic: publicB64,
    signedPrekeyPublic: publicB64,
    signedPrekeySignature: 'local-self-signed-p256-mobile',
    keyAlgo: 'p256-ecdh',
    appVersion: String(Constants.expoConfig?.version ?? '1.0.0'),
    platform,
  });
  await generateAndUploadPrekeys(deviceId, 12);
  await secureStorage.setItem(E2EE_REGISTERED_USER_KEY, JSON.stringify({ userId, deviceId }));
}

async function readE2eeRegistration(): Promise<{ userId: string; deviceId: string | null } | null> {
  const raw = await secureStorage.getItem(E2EE_REGISTERED_USER_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { userId?: string; deviceId?: string };
    if (o && typeof o.userId === 'string') {
      return { userId: o.userId, deviceId: o.deviceId != null ? String(o.deviceId) : null };
    }
  } catch {
    return { userId: String(raw), deviceId: null };
  }
  return null;
}

async function maybeRefillPrekeys(deviceId: string): Promise<void> {
  try {
    const res = await apiClient.get('/e2ee/prekeys/health', { params: { deviceId } });
    const raw = res.data?.data ?? res.data;
    const avail = Number(raw?.available_prekeys ?? raw?.availablePrekeys ?? 0);
    if (raw?.refill_recommended || raw?.refillRecommended || avail < 5) {
      await generateAndUploadPrekeys(deviceId, 20);
    }
  } catch {
    /* ignore */
  }
}

async function maybeRotateSignedPrekey(userId: string, deviceId: string): Promise<void> {
  try {
    const key = `${E2EE_LAST_ROTATE_KEY}:${userId}:${deviceId}`;
    const last = Number((await secureStorage.getItem(key)) || 0);
    const now = Date.now();
    if (last > 0 && now - last < ONE_DAY_MS) return;
    const { publicB64 } = await getOrCreateIdentityKeypair();
    await apiClient.post('/e2ee/devices/rotate-signed-prekey', {
      deviceId,
      signedPrekeyPublic: publicB64,
      signedPrekeySignature: 'local-self-signed-p256-rotated-mobile',
    });
    await secureStorage.setItem(key, String(now));
  } catch {
    /* non bloquant */
  }
}

async function runBootstrapBody(userId: string): Promise<{ deviceId: string; identityPublicKey: string } | null> {
  if (!(await initWebCryptoIfNeeded())) return null;
  const deviceId = await getOrCreateDeviceId();
  const { publicB64 } = await getOrCreateIdentityKeypair();
  const reg = await readE2eeRegistration();
  const sameUser = reg?.userId === userId;
  const storedDevice = reg?.deviceId || null;
  const deviceChanged = !!(storedDevice && storedDevice !== deviceId);

  if (!sameUser) {
    await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
  } else if (deviceChanged) {
    await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
  } else {
    try {
      await apiClient.get('/e2ee/prekeys/health', { params: { deviceId } });
      if (!storedDevice) await secureStorage.setItem(E2EE_REGISTERED_USER_KEY, JSON.stringify({ userId, deviceId }));
    } catch {
      await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
    }
  }

  await maybeRefillPrekeys(deviceId);
  await maybeRotateSignedPrekey(userId, deviceId);
  return { deviceId, identityPublicKey: publicB64 };
}

/** Enregistre device + prekeys si besoin (idempotent par user). */
export async function ensureE2eeBootstrap(userId: string | undefined | null): Promise<{ deviceId: string; identityPublicKey: string } | null> {
  if (!userId) return null;
  if (!(await initWebCryptoIfNeeded())) return null;
  let p = bootstrapInflight.get(userId);
  if (p) return p;
  /** Ne jamais rejeter : sinon après `import()` (fetchThenEval web) une erreur axios « Network Error » peut remonter en overlay rouge même si l’appelant a un `.catch()`. */
  p = runBootstrapBody(userId).catch((err: unknown) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[AfriWonder] E2EE bootstrap ignoré (API ou crypto) :', msg);
    }
    return null;
  });
  bootstrapInflight.set(userId, p);
  p.finally(() => {
    if (bootstrapInflight.get(userId) === p) bootstrapInflight.delete(userId);
  });
  return p;
}

export async function getLocalE2eeDeviceId(): Promise<string> {
  if (!(await initWebCryptoIfNeeded())) return '';
  return getOrCreateDeviceId();
}

/** Santé prekeys (nécessite bootstrap préalable). */
export async function fetchE2eePrekeyHealth(deviceId: string) {
  const res = await apiClient.get('/e2ee/prekeys/health', { params: { deviceId } });
  return res.data?.data ?? res.data;
}
