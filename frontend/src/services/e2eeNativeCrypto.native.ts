/**
 * iOS / Android : `react-native-quick-crypto` (JSI), avec repli WebCrypto si indisponible.
 */
import { Buffer } from 'buffer';

const TAG_LEN = 16;

type QuickCrypto = typeof import('react-native-quick-crypto').default;

let quickModule: QuickCrypto | null | undefined;

function getQuickCrypto(): QuickCrypto | null {
  if (quickModule !== undefined) return quickModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-quick-crypto') as { default?: QuickCrypto } & QuickCrypto;
    quickModule = mod.default ?? (mod as unknown as QuickCrypto);
    return quickModule;
  } catch {
    quickModule = null;
    return null;
  }
}

export function isQuickCryptoAvailable(): boolean {
  return getQuickCrypto() != null;
}

export function isAes256GcmCryptoAvailable(): boolean {
  if (getQuickCrypto()) return true;
  return typeof globalThis !== 'undefined' && !!globalThis.crypto?.subtle;
}

function toB64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function ensureKey32(key: Buffer): Buffer {
  if (key.length !== 32) throw new Error('[E2EE] Clé AES-256 requise (32 octets).');
  return key;
}

async function aes256GcmEncryptWeb(
  plaintext: string,
  key32: Uint8Array,
  aad?: string
): Promise<{ ciphertext: string; iv: string }> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('[E2EE] WebCrypto indisponible sur cette plateforme.');
  if (key32.byteLength !== 32) throw new Error('[E2EE] Clé AES-256 requise (32 octets).');
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const keyCopy = new Uint8Array(32);
  keyCopy.set(key32);
  const cryptoKey = await subtle.importKey('raw', keyCopy, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const pt = new TextEncoder().encode(plaintext);
  const ad = aad ? new TextEncoder().encode(aad) : undefined;
  const algo: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    additionalData: ad as BufferSource | undefined,
    tagLength: 128,
  };
  const ct = new Uint8Array(await subtle.encrypt(algo, cryptoKey, pt as BufferSource));
  return { iv: toB64(iv), ciphertext: toB64(ct) };
}

async function aes256GcmDecryptWeb(
  ciphertextB64: string,
  ivB64: string,
  key32: Uint8Array,
  aad?: string
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('[E2EE] WebCrypto indisponible.');
  if (key32.byteLength !== 32) throw new Error('[E2EE] Clé AES-256 requise (32 octets).');
  const ivRaw = fromB64(ivB64);
  const combinedRaw = fromB64(ciphertextB64);
  const iv = new Uint8Array(ivRaw);
  const combined = new Uint8Array(combinedRaw);
  const keyCopy = new Uint8Array(32);
  keyCopy.set(key32);
  const cryptoKey = await subtle.importKey('raw', keyCopy, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const ad = aad ? new TextEncoder().encode(aad) : undefined;
  const algo: AesGcmParams = {
    name: 'AES-GCM',
    iv: iv as BufferSource,
    additionalData: ad as BufferSource | undefined,
    tagLength: 128,
  };
  const plain = await subtle.decrypt(algo, cryptoKey, combined as BufferSource);
  return new TextDecoder().decode(plain);
}

export async function aes256GcmEncrypt(
  plaintext: string,
  key: Buffer,
  aad?: string
): Promise<{ ciphertext: string; iv: string }> {
  const k = ensureKey32(key);
  const qc = getQuickCrypto();
  if (qc) {
    const iv = qc.randomBytes(12);
    const cipher = qc.createCipheriv('aes-256-gcm', k, iv);
    if (aad) cipher.setAAD(Buffer.from(aad, 'utf8'));
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      iv: iv.toString('base64'),
      ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    };
  }

  const keyView = new Uint8Array(32);
  keyView.set(k);
  return aes256GcmEncryptWeb(plaintext, keyView, aad);
}

export async function aes256GcmDecrypt(
  ciphertextB64: string,
  ivB64: string,
  key: Buffer,
  aad?: string
): Promise<string> {
  const k = ensureKey32(key);
  const qc = getQuickCrypto();
  if (qc) {
    const combined = Buffer.from(ciphertextB64, 'base64');
    if (combined.length < TAG_LEN) throw new Error('[E2EE] ciphertext invalide.');
    const tag = combined.subarray(combined.length - TAG_LEN);
    const data = combined.subarray(0, combined.length - TAG_LEN);
    const decipher = qc.createDecipheriv('aes-256-gcm', k, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(tag);
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'));
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  const keyView = new Uint8Array(32);
  keyView.set(k);
  return aes256GcmDecryptWeb(ciphertextB64, ivB64, keyView, aad);
}

export function toAesKeyBuffer(key: Uint8Array | ArrayBuffer | string): Buffer {
  if (typeof key === 'string') {
    const s = key.trim();
    if (/^[0-9a-fA-F]{64}$/.test(s)) return Buffer.from(s, 'hex');
    return Buffer.from(s, 'base64');
  }
  const u = key instanceof Uint8Array ? key : new Uint8Array(key);
  return Buffer.from(u.buffer, u.byteOffset, u.byteLength);
}
