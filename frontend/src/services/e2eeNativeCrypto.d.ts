import type { Buffer } from 'buffer';

export function isQuickCryptoAvailable(): boolean;
export function isAes256GcmCryptoAvailable(): boolean;
export function aes256GcmEncrypt(
  plaintext: string,
  key: Buffer,
  aad?: string
): Promise<{ ciphertext: string; iv: string }>;
export function aes256GcmDecrypt(
  ciphertextB64: string,
  ivB64: string,
  key: Buffer,
  aad?: string
): Promise<string>;
export function toAesKeyBuffer(key: Uint8Array | ArrayBuffer | string): Buffer;
