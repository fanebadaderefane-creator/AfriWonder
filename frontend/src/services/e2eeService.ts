/**
 * AfriWonder — couche E2EE côté mobile (Expo).
 *
 * Ce module est l’API « produit » pour les écrans messagerie : appels HTTP vers
 * `/api/proxy/e2ee/*` et bootstrap des clés via `e2eeMobileService` (P-256 + prekeys,
 * aligné sur la PWA et `backend/src/services/e2ee.service.ts`).
 *
 * Chiffrement symétrique des enveloppes : AES-256-GCM via `e2eeNativeCrypto`
 * (`react-native-quick-crypto` sur iOS/Android, WebCrypto sur le web). Format :
 * `iv` base64 (12 octets), `ciphertext` base64 = **ciphertext || tag (16 octets)**,
 * `cipherAlgo` = `aes-256-gcm` (persisté tel quel par le serveur, max 64 car.).
 */

import apiClient from '../api/client';
import {
  ensureE2eeBootstrap,
  fetchE2eePrekeyHealth,
  getLocalE2eeDeviceId,
} from './e2eeMobileService';
import {
  aes256GcmDecrypt,
  aes256GcmEncrypt,
  isAes256GcmCryptoAvailable,
  isQuickCryptoAvailable,
  toAesKeyBuffer,
} from './e2eeNativeCrypto';

export { ensureE2eeBootstrap, fetchE2eePrekeyHealth, getLocalE2eeDeviceId };
export { isAes256GcmCryptoAvailable, isQuickCryptoAvailable, toAesKeyBuffer };

export type E2eeBundle = {
  user_id?: string;
  device_id?: string;
  identity_key_public?: string;
  signed_prekey_public?: string;
  signed_prekey_signature?: string;
  key_algo?: string;
  one_time_prekey?: {
    prekey_row_id?: string;
    key_id?: number;
    public_key?: string;
  } | null;
};

export type StoreEnvelopePayload = {
  conversationId?: string | null;
  groupId?: string | null;
  messageId?: string | null;
  groupMessageId?: string | null;
  senderDeviceId: string;
  recipientUserId?: string | null;
  recipientDeviceId?: string | null;
  ciphertext: string;
  iv: string;
  aad?: string | null;
  cipherAlgo?: string | null;
  messageType?: string | null;
  clientMessageId?: string | null;
};

export type SyncEnvelopesParams = {
  deviceId: string;
  since?: string;
  limit?: number;
  conversationId?: string;
  groupId?: string;
};

function unwrap<T>(res: { data?: { data?: T; success?: boolean } & T }): T {
  const d = res.data;
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined) return d.data as T;
  return d as T;
}

/** AAD attendu par le backend (JSON → base64). */
export function buildEnvelopeAad(parts: {
  ts?: number;
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId?: string;
  recipientDeviceId?: string;
}): string {
  const payload = {
    ts: parts.ts ?? Date.now(),
    senderUserId: parts.senderUserId,
    senderDeviceId: parts.senderDeviceId,
    ...(parts.recipientUserId ? { recipientUserId: parts.recipientUserId } : {}),
    ...(parts.recipientDeviceId ? { recipientDeviceId: parts.recipientDeviceId } : {}),
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

class E2eeService {
  /** Enregistrement device + prekeys (idempotent). */
  async bootstrap(userId: string | null | undefined) {
    return ensureE2eeBootstrap(userId ?? null);
  }

  async deviceId(): Promise<string> {
    return getLocalE2eeDeviceId();
  }

  async prekeyHealth(deviceId: string) {
    return fetchE2eePrekeyHealth(deviceId);
  }

  async getBundle(targetUserId: string): Promise<E2eeBundle | null> {
    try {
      const res = await apiClient.get(`/e2ee/bundle/${encodeURIComponent(targetUserId)}`);
      return unwrap<E2eeBundle>(res);
    } catch {
      return null;
    }
  }

  async hasPeerKeys(targetUserId: string): Promise<boolean> {
    const b = await this.getBundle(targetUserId);
    return !!(b?.identity_key_public && b?.device_id);
  }

  async listMyDevices() {
    const res = await apiClient.get('/e2ee/devices/my');
    return unwrap(res);
  }

  async listPeerDevices(userId: string) {
    const res = await apiClient.get(`/e2ee/devices/public/${encodeURIComponent(userId)}`);
    return unwrap(res);
  }

  async storeEnvelope(payload: StoreEnvelopePayload) {
    const res = await apiClient.post('/e2ee/messages/envelope', payload);
    return unwrap(res);
  }

  async syncEnvelopes(params: SyncEnvelopesParams) {
    const res = await apiClient.get('/e2ee/messages/sync', {
      params: {
        deviceId: params.deviceId,
        since: params.since,
        limit: params.limit ?? 100,
        conversationId: params.conversationId,
        groupId: params.groupId,
      },
    });
    return unwrap(res);
  }

  async consumePrekey(prekeyRowId: string) {
    const res = await apiClient.post('/e2ee/prekeys/consume', { prekeyRowId, prekey_row_id: prekeyRowId });
    return unwrap(res);
  }

  /** Indique si AES-256-GCM (QuickCrypto ou WebCrypto) est utilisable sur cette plateforme. */
  aesGcmAvailable(): boolean {
    return isAes256GcmCryptoAvailable();
  }

  /**
   * Chiffre un texte avec une clé de message 32 octets (issu du ratchet / ECDH côté app).
   * `aad` : en pratique `buildEnvelopeAad(...)` (même chaîne base64 que pour `storeEnvelope`).
   */
  async encryptEnvelopePayload(
    plaintext: string,
    messageKey: Uint8Array | ArrayBuffer | string,
    aad?: string
  ): Promise<{ ciphertext: string; iv: string; cipherAlgo: 'aes-256-gcm' }> {
    const keyBuf = toAesKeyBuffer(messageKey);
    const { ciphertext, iv } = await aes256GcmEncrypt(plaintext, keyBuf, aad);
    return { ciphertext, iv, cipherAlgo: 'aes-256-gcm' };
  }

  async decryptEnvelopePayload(
    ciphertextB64: string,
    ivB64: string,
    messageKey: Uint8Array | ArrayBuffer | string,
    aad?: string
  ): Promise<string> {
    const keyBuf = toAesKeyBuffer(messageKey);
    return aes256GcmDecrypt(ciphertextB64, ivB64, keyBuf, aad);
  }
}

export const e2eeService = new E2eeService();
export default e2eeService;
