import { api } from '@/api/expressClient';
import { getJSON, getItem, setItem, setJSON } from '@/utils/safeStorage';

const E2EE_DEVICE_ID_KEY = 'aw-e2ee-device-id-v1';
const E2EE_PRIVATE_KEY_KEY = 'aw-e2ee-private-key-b64-v1';
const E2EE_PUBLIC_KEY_KEY = 'aw-e2ee-public-key-b64-v1';
const E2EE_REGISTERED_USER_KEY = 'aw-e2ee-registered-user-v1';
const E2EE_PREKEY_COUNTER_KEY = 'aw-e2ee-prekey-counter-v1';
const E2EE_PREKEYS_PRIVATE_KEY = 'aw-e2ee-prekeys-private-v1';
const E2EE_SENDER_DEVICE_KEYS_CACHE = 'aw-e2ee-sender-device-keys-cache-v1';
const E2EE_LAST_SIGNED_PREKEY_ROTATION_KEY = 'aw-e2ee-last-rotate-v1';
const E2EE_EVENT_LOG_KEY = 'aw-e2ee-event-log-v1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/** Un seul bootstrap à la fois par user (évite plusieurs POST /devices/register parallèles → annulations Firefox). */
const e2eeBootstrapInflight = new Map();
export const E2EE_STRICT_MODE = String(import.meta?.env?.VITE_E2EE_STRICT_MODE ?? 'true').toLowerCase() !== 'false';

function toBase64(bytes) {
  let binary = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunkSize = 0x8000;
  for (let i = 0; i < arr.length; i += chunkSize) {
    binary += String.fromCharCode(...arr.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(String(b64 || ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function getOrCreateDeviceId() {
  const existing = getItem(E2EE_DEVICE_ID_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  setItem(E2EE_DEVICE_ID_KEY, generated);
  return generated;
}

export function getCurrentE2eeDeviceId() {
  return getOrCreateDeviceId();
}

async function exportPublicSpkiBase64(keyPair) {
  const spki = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  return toBase64(new Uint8Array(spki));
}

async function exportPrivatePkcs8Base64(keyPair) {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  return toBase64(new Uint8Array(pkcs8));
}

async function importPrivateKeyFromBase64(pkcs8B64) {
  const bytes = fromBase64(pkcs8B64);
  return crypto.subtle.importKey(
    'pkcs8',
    bytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
}

async function importPublicKeyFromBase64(spkiB64) {
  const bytes = fromBase64(spkiB64);
  return crypto.subtle.importKey(
    'spki',
    bytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

async function deriveAesKeyFromPeerPublic(myPrivateKey, peerPublicSpkiB64) {
  const peerPublicKey = await importPublicKeyFromBase64(peerPublicSpkiB64);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function getOrCreateIdentityKeypair() {
  const publicB64 = getItem(E2EE_PUBLIC_KEY_KEY);
  const privateB64 = getItem(E2EE_PRIVATE_KEY_KEY);
  if (publicB64 && privateB64) {
    const privateKey = await importPrivateKeyFromBase64(privateB64);
    return { publicB64, privateKey };
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const exportedPublic = await exportPublicSpkiBase64(keyPair);
  const exportedPrivate = await exportPrivatePkcs8Base64(keyPair);
  setItem(E2EE_PUBLIC_KEY_KEY, exportedPublic);
  setItem(E2EE_PRIVATE_KEY_KEY, exportedPrivate);
  return { publicB64: exportedPublic, privateKey: keyPair.privateKey };
}

async function generateAndUploadPrekeys(deviceId, count = 10) {
  let start = Number(getItem(E2EE_PREKEY_COUNTER_KEY) || 1);
  if (!Number.isFinite(start) || start < 1) start = 1;
  const privateMap = getJSON(E2EE_PREKEYS_PRIVATE_KEY, {}) || {};
  const rows = [];
  let cursor = start;

  for (let i = 0; i < count; i += 1) {
    const kp = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    const pub = await exportPublicSpkiBase64(kp);
    const priv = await exportPrivatePkcs8Base64(kp);
    const keyId = cursor++;
    rows.push({ keyId, publicKey: pub });
    privateMap[String(keyId)] = priv;
  }

  await api.e2ee.uploadPrekeys(deviceId, rows);
  setJSON(E2EE_PREKEYS_PRIVATE_KEY, privateMap);
  setItem(E2EE_PREKEY_COUNTER_KEY, String(cursor));
}

async function maybeRefillPrekeys(deviceId) {
  try {
    const health = await api.e2ee.getPrekeyHealth(deviceId);
    const avail = Number(health?.available_prekeys ?? health?.availablePrekeys ?? 0);
    if (health?.refill_recommended || health?.refillRecommended || avail < 5) {
      await generateAndUploadPrekeys(deviceId, 20);
    }
  } catch {
    // ignore non-blocking health checks
  }
}

/** Si le stock serveur est vide ou trop bas malgré le device enregistré, on pousse un lot (idempotent côté clés). */
async function ensurePrekeysStock(deviceId, minAvailable = 5) {
  let health;
  try {
    health = await api.e2ee.getPrekeyHealth(deviceId);
  } catch {
    return;
  }
  const avail = Number(health?.available_prekeys ?? health?.availablePrekeys ?? 0);
  const total = Number(health?.total_prekeys ?? health?.totalPrekeys ?? 0);
  if (avail >= minAvailable) return;
  const batch = avail === 0 && total === 0 ? 24 : Math.max(20, minAvailable - avail + 8);
  try {
    await generateAndUploadPrekeys(deviceId, batch);
  } catch {
    /* register path ou réseau : laisser l’UI proposer Réparer */
  }
}

async function maybeRotateSignedPrekey(userId, deviceId) {
  try {
    const key = `${E2EE_LAST_SIGNED_PREKEY_ROTATION_KEY}:${userId}:${deviceId}`;
    const last = Number(getItem(key) || 0);
    const now = Date.now();
    if (last > 0 && now - last < ONE_DAY_MS) return;
    const { publicB64 } = await getOrCreateIdentityKeypair();
    await api.e2ee.rotateSignedPrekey({
      deviceId,
      signedPrekeyPublic: publicB64,
      signedPrekeySignature: 'local-self-signed-p256-rotated',
    });
    setItem(key, String(now));
  } catch {
    // non-blocking rotation
  }
}

function normalizeDeviceHealth(raw, deviceId) {
  const available = Number(raw?.available_prekeys ?? raw?.availablePrekeys ?? 0);
  const availN = Number.isFinite(available) ? available : 0;
  const refillRecommended =
    !!raw?.refill_recommended ||
    !!raw?.refillRecommended ||
    (Number.isFinite(available) ? available < 5 : true);
  return {
    deviceId,
    availablePrekeys: availN,
    refillRecommended,
    /** UI : n’alarmer que si plus aucune prekey exploitable (le serveur « refill < 5 » reste géré en tâche de fond). */
    healthy: availN >= 1,
    checkedAt: new Date().toISOString(),
  };
}

/** Ancien format: une seule chaîne = userId. Nouveau: JSON { userId, deviceId }. */
function readE2eeRegistration() {
  const raw = getItem(E2EE_REGISTERED_USER_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === 'object' && typeof o.userId === 'string') {
      return { userId: o.userId, deviceId: o.deviceId != null ? String(o.deviceId) : null };
    }
  } catch {
    /* legacy: valeur = userId seul */
  }
  return { userId: String(raw), deviceId: null };
}

function writeE2eeRegistration(userId, deviceId) {
  setItem(E2EE_REGISTERED_USER_KEY, JSON.stringify({ userId, deviceId }));
}

async function registerDeviceAndUploadPrekeys(userId, deviceId, publicB64) {
  await api.e2ee.registerDevice({
    deviceId,
    identityKeyPublic: publicB64,
    signedPrekeyPublic: publicB64,
    signedPrekeySignature: 'local-self-signed-p256',
    keyAlgo: 'p256-ecdh',
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? String(__APP_VERSION__) : 'web',
    platform: 'web',
  });
  await generateAndUploadPrekeys(deviceId, 12);
  writeE2eeRegistration(userId, deviceId);
}

function pushE2eeEvent(event) {
  try {
    const prev = getJSON(E2EE_EVENT_LOG_KEY, []) || [];
    const next = [
      {
        at: new Date().toISOString(),
        ...event,
      },
      ...prev,
    ].slice(0, 60);
    setJSON(E2EE_EVENT_LOG_KEY, next);
  } catch {
    // best effort
  }
}

async function runE2eeBootstrapBody(userId) {
  const deviceId = getOrCreateDeviceId();
  const { publicB64 } = await getOrCreateIdentityKeypair();
  const reg = readE2eeRegistration();

  const sameUser = reg?.userId === userId;
  const storedDevice = reg?.deviceId || null;
  const deviceChanged = !!(storedDevice && storedDevice !== deviceId);

  if (!sameUser) {
    await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
  } else if (deviceChanged) {
    /** Ex. deviceId régénéré (stockage partiellement effacé) : le serveur n’a pas ce device. */
    await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
  } else {
    try {
      await api.e2ee.getPrekeyHealth(deviceId);
      if (!storedDevice) writeE2eeRegistration(userId, deviceId);
    } catch {
      await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
    }
  }

  await maybeRefillPrekeys(deviceId);
  await ensurePrekeysStock(deviceId, 5);
  await maybeRotateSignedPrekey(userId, deviceId);

  return { deviceId, identityPublicKey: publicB64 };
}

export async function ensureE2eeBootstrap(userId) {
  if (!userId || !crypto?.subtle) return null;
  let p = e2eeBootstrapInflight.get(userId);
  if (p) return p;
  /** Enregistrer avant le premier await du corps (sinon 2e appel synchrone démarre un 2e bootstrap). */
  p = Promise.resolve().then(() => runE2eeBootstrapBody(userId));
  e2eeBootstrapInflight.set(userId, p);
  p.finally(() => {
    if (e2eeBootstrapInflight.get(userId) === p) e2eeBootstrapInflight.delete(userId);
  });
  return p;
}

export async function getLocalE2eeDeviceHealth(userId) {
  if (!userId) return null;
  try {
    const bootstrap = await ensureE2eeBootstrap(userId);
    const deviceId = bootstrap?.deviceId || getOrCreateDeviceId();
    const health = await api.e2ee.getPrekeyHealth(deviceId);
    const normalized = normalizeDeviceHealth(health, deviceId);
    pushE2eeEvent({
      kind: 'health_check',
      userId,
      deviceId,
      availablePrekeys: normalized.availablePrekeys,
      healthy: normalized.healthy,
    });
    return normalized;
  } catch (e) {
    let deviceId = null;
    try {
      deviceId = getOrCreateDeviceId();
    } catch {
      /* ignore */
    }
    const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || 'error';
    pushE2eeEvent({
      kind: 'health_check_error',
      userId,
      deviceId: deviceId || 'unknown',
      message: typeof msg === 'string' ? msg.slice(0, 200) : 'error',
    });
    /** Ne pas afficher « clés faibles » si la vérif. n’a pas abouti (réseau, 401, serveur). */
    return null;
  }
}

export async function repairLocalE2eeDevice(userId) {
  if (!userId) return null;
  let deviceId;
  try {
    deviceId = getOrCreateDeviceId();
    const { publicB64 } = await getOrCreateIdentityKeypair();

    try {
      await ensureE2eeBootstrap(userId);
    } catch {
      /** Bootstrap complet a échoué (réseau, 401, 500…) : on repart d’un enregistrement propre. */
      try {
        setItem(E2EE_REGISTERED_USER_KEY, '');
      } catch {
        /* ignore */
      }
      await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
    }

    await maybeRefillPrekeys(deviceId);
    await ensurePrekeysStock(deviceId, 5);
    await maybeRotateSignedPrekey(userId, deviceId);

    let health = await api.e2ee.getPrekeyHealth(deviceId).catch(() => null);
    const avail = Number(health?.available_prekeys ?? health?.availablePrekeys ?? 0);

    /** Dernier recours si le stock reste vide (upload partiel, décalage device, etc.). */
    if (!health || avail < 5) {
      try {
        await registerDeviceAndUploadPrekeys(userId, deviceId, publicB64);
      } catch {
        /* ignore */
      }
      try {
        await generateAndUploadPrekeys(deviceId, 24);
      } catch {
        /* ignore */
      }
      health = await api.e2ee.getPrekeyHealth(deviceId).catch(() => null);
    }

    const normalized = normalizeDeviceHealth(
      health || { available_prekeys: 0, refill_recommended: true },
      deviceId
    );
    pushE2eeEvent({
      kind: 'repair_attempt',
      userId,
      deviceId,
      availablePrekeys: normalized.availablePrekeys,
      healthy: normalized.healthy,
    });
    return normalized;
  } catch (e) {
    let fallbackDeviceId = deviceId;
    if (!fallbackDeviceId) {
      try {
        fallbackDeviceId = getOrCreateDeviceId();
      } catch {
        fallbackDeviceId = 'local-device';
      }
    }
    const msg = e?.response?.data?.error?.message || e?.response?.data?.message || e?.message || String(e);
    pushE2eeEvent({
      kind: 'repair_error',
      userId,
      deviceId: fallbackDeviceId,
      message: typeof msg === 'string' ? msg.slice(0, 200) : 'error',
    });
    return normalizeDeviceHealth({ available_prekeys: 0, refill_recommended: true }, fallbackDeviceId);
  }
}

export function getLocalE2eeEventLog() {
  return getJSON(E2EE_EVENT_LOG_KEY, []) || [];
}

export async function buildE2eeEnvelopeForRecipient(recipientUserId, plaintext, meta = {}) {
  if (!recipientUserId || typeof plaintext !== 'string' || !plaintext.length) return null;
  if (!crypto?.subtle) return null;

  const bootstrap = await ensureE2eeBootstrap(meta.senderUserId);
  if (!bootstrap?.deviceId) return null;

  const { privateKey } = await getOrCreateIdentityKeypair();
  const bundle = await api.e2ee.getBundle(recipientUserId);
  if (!bundle?.device_id || !bundle?.signed_prekey_public) return null;

  const aesKey = await deriveAesKeyFromPeerPublic(privateKey, bundle.signed_prekey_public);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aadObj = {
    senderUserId: meta.senderUserId || null,
    recipientUserId,
    senderDeviceId: bootstrap.deviceId,
    recipientDeviceId: bundle.device_id,
    kind: meta.messageType || 'text',
    ts: Date.now(),
  };
  const aad = new TextEncoder().encode(JSON.stringify(aadObj));
  const plain = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    aesKey,
    plain
  );

  if (bundle.one_time_prekey?.prekey_row_id) {
    api.e2ee.consumePrekey(bundle.one_time_prekey.prekey_row_id).catch(() => {});
  }

  return {
    senderDeviceId: bootstrap.deviceId,
    recipientUserId,
    recipientDeviceId: bundle.device_id,
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    aad: toBase64(aad),
    cipherAlgo: 'aes-gcm-256+ecdh-p256',
    messageType: meta.messageType || 'text',
    clientMessageId: meta.clientMessageId || null,
  };
}

async function getSenderPublicKeyByDevice(senderUserId, senderDeviceId) {
  const cache = getJSON(E2EE_SENDER_DEVICE_KEYS_CACHE, {}) || {};
  const cacheKey = `${senderUserId}:${senderDeviceId}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const devices = await api.e2ee.getUserPublicDevices(senderUserId);
  const found = (devices || []).find((d) => String(d.device_id) === String(senderDeviceId));
  const key = found?.signed_prekey_public || null;
  if (key) {
    cache[cacheKey] = key;
    setJSON(E2EE_SENDER_DEVICE_KEYS_CACHE, cache);
  }
  return key;
}

async function decryptEnvelope(envelope) {
  if (!envelope?.ciphertext || !envelope?.iv || !envelope?.sender_user_id || !envelope?.sender_device_id) return null;
  const { privateKey } = await getOrCreateIdentityKeypair();
  const senderPublicKeyB64 = await getSenderPublicKeyByDevice(envelope.sender_user_id, envelope.sender_device_id);
  if (!senderPublicKeyB64) return null;

  const aesKey = await deriveAesKeyFromPeerPublic(privateKey, senderPublicKeyB64);
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  const aad = envelope.aad ? fromBase64(envelope.aad) : undefined;
  const plain = await crypto.subtle.decrypt(
    aad?.byteLength
      ? { name: 'AES-GCM', iv, additionalData: aad }
      : { name: 'AES-GCM', iv },
    aesKey,
    ciphertext
  );
  return new TextDecoder().decode(plain);
}

export async function syncAndDecryptDmEnvelopes({
  currentUserId,
  deviceId,
  since = null,
  limit = 150,
  conversationId = null,
}) {
  if (!currentUserId || !deviceId) return { byMessageId: {}, nextSince: since };
  const data = await api.e2ee.syncEnvelopes({ deviceId, since, limit, conversationId });
  const byMessageId = {};
  const items = Array.isArray(data?.items) ? data.items : [];
  for (const item of items) {
    if (!item?.message_id) continue;
    if (item.recipient_user_id && String(item.recipient_user_id) !== String(currentUserId)) continue;
    try {
      const plain = await decryptEnvelope(item);
      if (typeof plain === 'string') byMessageId[item.message_id] = plain;
    } catch {
      // ignore malformed/old envelopes
    }
  }
  return { byMessageId, nextSince: data?.nextSince || since };
}

export async function syncAndDecryptGroupEnvelopes({ currentUserId, deviceId, groupId, since = null, limit = 200 }) {
  if (!currentUserId || !deviceId || !groupId) return { byGroupMessageId: {}, nextSince: since };
  const data = await api.e2ee.syncEnvelopes({ deviceId, since, limit, groupId });
  const byGroupMessageId = {};
  const items = Array.isArray(data?.items) ? data.items : [];
  for (const item of items) {
    if (!item?.group_message_id || String(item.group_id || '') !== String(groupId)) continue;
    if (item.recipient_user_id && String(item.recipient_user_id) !== String(currentUserId)) continue;
    try {
      const plain = await decryptEnvelope(item);
      if (typeof plain === 'string') byGroupMessageId[item.group_message_id] = plain;
    } catch {
      // ignore malformed/old envelopes
    }
  }
  return { byGroupMessageId, nextSince: data?.nextSince || since };
}

export async function buildGroupE2eeEnvelopes(groupMembers, plaintext, meta = {}) {
  if (!Array.isArray(groupMembers) || !groupMembers.length || !plaintext?.trim() || !meta?.senderUserId) return [];
  const senderUserId = String(meta.senderUserId);
  const recipients = groupMembers
    .map((m) => String(m?.id || m?.user_id || ''))
    .filter((id) => id && id !== senderUserId);
  const uniqueRecipients = [...new Set(recipients)];
  const out = [];
  for (const recipientUserId of uniqueRecipients) {
    try {
      const env = await buildE2eeEnvelopeForRecipient(recipientUserId, plaintext, {
        senderUserId,
        messageType: meta.messageType || 'text',
        clientMessageId: meta.clientMessageId || null,
      });
      if (env) out.push(env);
    } catch {
      // continue with other recipients
    }
  }
  return out;
}
