import crypto from 'crypto';
import prisma from '../config/database.js';

type HttpError = Error & { statusCode?: number };

function makeError(message: string, statusCode: number): HttpError {
  const err = new Error(message) as HttpError;
  err.statusCode = statusCode;
  return err;
}

function normalizeStr(v: unknown, maxLen: number): string {
  return String(v ?? '').trim().slice(0, maxLen);
}

class E2eeService {
  private decodeAadObject(aadBase64: string | null): {
    ts?: number;
    senderUserId?: string;
    recipientUserId?: string;
    senderDeviceId?: string;
    recipientDeviceId?: string;
  } | null {
    if (!aadBase64) return null;
    try {
      const raw = Buffer.from(aadBase64, 'base64').toString('utf8');
      const parsed = JSON.parse(raw) as {
        ts?: unknown;
        senderUserId?: unknown;
        recipientUserId?: unknown;
        senderDeviceId?: unknown;
        recipientDeviceId?: unknown;
      };
      return {
        ts: Number.isFinite(Number(parsed?.ts)) ? Number(parsed.ts) : undefined,
        senderUserId: parsed?.senderUserId != null ? String(parsed.senderUserId) : undefined,
        recipientUserId: parsed?.recipientUserId != null ? String(parsed.recipientUserId) : undefined,
        senderDeviceId: parsed?.senderDeviceId != null ? String(parsed.senderDeviceId) : undefined,
        recipientDeviceId: parsed?.recipientDeviceId != null ? String(parsed.recipientDeviceId) : undefined,
      };
    } catch {
      return null;
    }
  }

  async registerDevice(userId: string, payload: {
    deviceId?: string;
    identityKeyPublic?: string;
    signedPrekeyPublic?: string;
    signedPrekeySignature?: string;
    keyAlgo?: string;
    appVersion?: string;
    platform?: string;
  }) {
    const deviceId = normalizeStr(payload.deviceId, 128);
    const identityKeyPublic = normalizeStr(payload.identityKeyPublic, 4096);
    const signedPrekeyPublic = normalizeStr(payload.signedPrekeyPublic, 4096);
    const signedPrekeySignature = normalizeStr(payload.signedPrekeySignature, 4096);
    const keyAlgo = normalizeStr(payload.keyAlgo || 'x25519', 64);
    const appVersion = normalizeStr(payload.appVersion, 128) || null;
    const platform = normalizeStr(payload.platform, 64) || null;

    if (!deviceId || !identityKeyPublic || !signedPrekeyPublic || !signedPrekeySignature) {
      throw makeError('Champs device/key manquants', 400);
    }

    const now = new Date();
    const upserted = await prisma.userE2eeDevice.upsert({
      where: { user_id_device_id: { user_id: userId, device_id: deviceId } },
      create: {
        id: crypto.randomUUID(),
        user_id: userId,
        device_id: deviceId,
        identity_key_public: identityKeyPublic,
        signed_prekey_public: signedPrekeyPublic,
        signed_prekey_signature: signedPrekeySignature,
        key_algo: keyAlgo,
        app_version: appVersion,
        platform,
        last_seen_at: now,
      },
      update: {
        identity_key_public: identityKeyPublic,
        signed_prekey_public: signedPrekeyPublic,
        signed_prekey_signature: signedPrekeySignature,
        key_algo: keyAlgo,
        app_version: appVersion,
        platform,
        last_seen_at: now,
      },
      select: {
        id: true,
        user_id: true,
        device_id: true,
        key_algo: true,
        app_version: true,
        platform: true,
        last_seen_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return upserted;
  }

  async uploadPrekeys(userId: string, payload: { deviceId?: string; prekeys?: Array<{ keyId?: number; publicKey?: string }> }) {
    const deviceId = normalizeStr(payload.deviceId, 128);
    const prekeys = Array.isArray(payload.prekeys) ? payload.prekeys : [];
    if (!deviceId || prekeys.length === 0) throw makeError('deviceId et prekeys requis', 400);

    const device = await prisma.userE2eeDevice.findFirst({
      where: { user_id: userId, device_id: deviceId },
      select: { id: true },
    });
    if (!device) throw makeError('Device non trouvé', 404);

    const rows = prekeys
      .map((p) => ({
        id: crypto.randomUUID(),
        user_id: userId,
        device_id: deviceId,
        key_id: Number(p?.keyId),
        public_key: normalizeStr(p?.publicKey, 4096),
      }))
      .filter((p) => Number.isFinite(p.key_id) && p.key_id >= 0 && !!p.public_key);

    if (rows.length === 0) throw makeError('Aucune prekey valide', 400);

    await prisma.userE2eePrekey.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return { count: rows.length };
  }

  async getPrekeyHealth(userId: string, deviceIdRaw: string) {
    const deviceId = normalizeStr(deviceIdRaw, 128);
    if (!deviceId) throw makeError('deviceId requis', 400);
    const device = await prisma.userE2eeDevice.findFirst({
      where: { user_id: userId, device_id: deviceId },
      select: { id: true },
    });
    if (!device) throw makeError('Device non trouvé', 404);

    const [available, total] = await Promise.all([
      prisma.userE2eePrekey.count({
        where: { user_id: userId, device_id: deviceId, consumed_at: null },
      }),
      prisma.userE2eePrekey.count({
        where: { user_id: userId, device_id: deviceId },
      }),
    ]);
    return {
      device_id: deviceId,
      available_prekeys: available,
      total_prekeys: total,
      refill_recommended: available < 5,
    };
  }

  async rotateSignedPrekey(userId: string, payload: {
    deviceId?: string;
    signedPrekeyPublic?: string;
    signedPrekeySignature?: string;
  }) {
    const deviceId = normalizeStr(payload.deviceId, 128);
    const signedPrekeyPublic = normalizeStr(payload.signedPrekeyPublic, 4096);
    const signedPrekeySignature = normalizeStr(payload.signedPrekeySignature, 4096);
    if (!deviceId || !signedPrekeyPublic || !signedPrekeySignature) {
      throw makeError('deviceId + signedPrekey requis', 400);
    }

    const updated = await prisma.userE2eeDevice.updateMany({
      where: { user_id: userId, device_id: deviceId },
      data: {
        signed_prekey_public: signedPrekeyPublic,
        signed_prekey_signature: signedPrekeySignature,
        last_seen_at: new Date(),
      },
    });
    if (updated.count === 0) throw makeError('Device non trouvé', 404);
    return { success: true };
  }

  async getMyDevices(userId: string) {
    return prisma.userE2eeDevice.findMany({
      where: { user_id: userId },
      orderBy: [{ last_seen_at: 'desc' }, { created_at: 'desc' }],
      select: {
        id: true,
        device_id: true,
        key_algo: true,
        app_version: true,
        platform: true,
        last_seen_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  }

  async getUserPublicDevices(targetUserId: string) {
    const userId = normalizeStr(targetUserId, 64);
    if (!userId) throw makeError('userId requis', 400);
    return prisma.userE2eeDevice.findMany({
      where: { user_id: userId },
      orderBy: [{ last_seen_at: 'desc' }, { created_at: 'asc' }],
      select: {
        user_id: true,
        device_id: true,
        identity_key_public: true,
        signed_prekey_public: true,
        signed_prekey_signature: true,
        key_algo: true,
        last_seen_at: true,
      },
    });
  }

  async getBundle(targetUserId: string, requesterUserId: string) {
    if (!targetUserId) throw makeError('userId cible requis', 400);
    if (targetUserId === requesterUserId) throw makeError('Bundle cible invalide', 400);

    const device = await prisma.userE2eeDevice.findFirst({
      where: { user_id: targetUserId },
      orderBy: [{ last_seen_at: 'desc' }, { created_at: 'asc' }],
      select: {
        user_id: true,
        device_id: true,
        identity_key_public: true,
        signed_prekey_public: true,
        signed_prekey_signature: true,
        key_algo: true,
      },
    });
    if (!device) throw makeError('Aucun device E2E enregistré pour cet utilisateur', 404);

    const oneTimePrekey = await prisma.userE2eePrekey.findFirst({
      where: {
        user_id: targetUserId,
        device_id: device.device_id,
        consumed_at: null,
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        key_id: true,
        public_key: true,
      },
    });

    return {
      user_id: device.user_id,
      device_id: device.device_id,
      identity_key_public: device.identity_key_public,
      signed_prekey_public: device.signed_prekey_public,
      signed_prekey_signature: device.signed_prekey_signature,
      key_algo: device.key_algo,
      one_time_prekey: oneTimePrekey
        ? {
            prekey_row_id: oneTimePrekey.id,
            key_id: oneTimePrekey.key_id,
            public_key: oneTimePrekey.public_key,
          }
        : null,
    };
  }

  async consumePrekey(prekeyRowId: string, consumerUserId: string) {
    const rowId = normalizeStr(prekeyRowId, 64);
    if (!rowId) throw makeError('prekeyRowId requis', 400);

    const existing = await prisma.userE2eePrekey.findFirst({
      where: { id: rowId },
      select: { id: true, consumed_at: true, consumed_by_user_id: true },
    });
    if (!existing) throw makeError('Prekey introuvable', 404);
    if (existing.consumed_at) {
      return {
        id: existing.id,
        consumed_at: existing.consumed_at,
        consumed_by_user_id: existing.consumed_by_user_id,
        already_consumed: true,
      };
    }

    const updated = await prisma.userE2eePrekey.update({
      where: { id: rowId },
      data: {
        consumed_at: new Date(),
        consumed_by_user_id: consumerUserId,
      },
      select: {
        id: true,
        consumed_at: true,
        consumed_by_user_id: true,
      },
    });

    return { ...updated, already_consumed: false };
  }

  async storeEnvelope(senderUserId: string, payload: {
    conversationId?: string | null;
    groupId?: string | null;
    messageId?: string | null;
    groupMessageId?: string | null;
    senderDeviceId?: string;
    recipientUserId?: string | null;
    recipientDeviceId?: string | null;
    ciphertext?: string;
    iv?: string;
    aad?: string | null;
    cipherAlgo?: string | null;
    messageType?: string | null;
    clientMessageId?: string | null;
  }) {
    const senderDeviceId = normalizeStr(payload.senderDeviceId, 128);
    const ciphertext = normalizeStr(payload.ciphertext, 20000);
    const iv = normalizeStr(payload.iv, 512);
    const aad = normalizeStr(payload.aad, 4000) || null;
    const cipherAlgo = normalizeStr(payload.cipherAlgo || 'xchacha20poly1305', 64);
    const messageType = normalizeStr(payload.messageType || 'text', 64);
    const clientMessageId = normalizeStr(payload.clientMessageId, 128) || null;
    const conversationId = normalizeStr(payload.conversationId, 64) || null;
    const groupId = normalizeStr(payload.groupId, 64) || null;
    const messageId = normalizeStr(payload.messageId, 64) || null;
    const groupMessageId = normalizeStr(payload.groupMessageId, 64) || null;
    const recipientUserId = normalizeStr(payload.recipientUserId, 64) || null;
    const recipientDeviceId = normalizeStr(payload.recipientDeviceId, 128) || null;

    if (!senderDeviceId || !ciphertext || !iv) throw makeError('Envelope invalide', 400);
    if (!conversationId && !groupId) throw makeError('conversationId ou groupId requis', 400);

    const senderDevice = await prisma.userE2eeDevice.findFirst({
      where: { user_id: senderUserId, device_id: senderDeviceId },
      select: { id: true },
    });
    if (!senderDevice) throw makeError('Sender device non enregistré', 403);

    const aadObj = this.decodeAadObject(aad);
    const aadTs = aadObj?.ts;
    if (aadTs != null) {
      const now = Date.now();
      const maxFutureSkewMs = 10 * 60 * 1000;
      const maxPastWindowMs = 7 * 24 * 60 * 60 * 1000;
      if (aadTs > now + maxFutureSkewMs || aadTs < now - maxPastWindowMs) {
        throw makeError('Envelope rejetée (fenêtre temporelle invalide)', 400);
      }
    }
    if (aadObj?.senderUserId && aadObj.senderUserId !== senderUserId) {
      throw makeError('Envelope rejetée (AAD sender mismatch)', 400);
    }
    if (aadObj?.senderDeviceId && aadObj.senderDeviceId !== senderDeviceId) {
      throw makeError('Envelope rejetée (AAD sender device mismatch)', 400);
    }
    if (recipientUserId && aadObj?.recipientUserId && aadObj.recipientUserId !== recipientUserId) {
      throw makeError('Envelope rejetée (AAD recipient mismatch)', 400);
    }
    if (recipientDeviceId && aadObj?.recipientDeviceId && aadObj.recipientDeviceId !== recipientDeviceId) {
      throw makeError('Envelope rejetée (AAD recipient device mismatch)', 400);
    }

    if (clientMessageId) {
      const existing = await prisma.encryptedMessageEnvelope.findFirst({
        where: {
          sender_user_id: senderUserId,
          sender_device_id: senderDeviceId,
          client_message_id: clientMessageId,
          recipient_user_id: recipientUserId,
          recipient_device_id: recipientDeviceId,
        },
        select: {
          id: true,
          conversation_id: true,
          group_id: true,
          message_id: true,
          group_message_id: true,
          sender_user_id: true,
          sender_device_id: true,
          recipient_user_id: true,
          recipient_device_id: true,
          message_type: true,
          cipher_algo: true,
          client_message_id: true,
          created_at: true,
        },
      });
      if (existing) return existing;
    }

    const created = await prisma.encryptedMessageEnvelope.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        group_id: groupId,
        message_id: messageId,
        group_message_id: groupMessageId,
        sender_user_id: senderUserId,
        sender_device_id: senderDeviceId,
        recipient_user_id: recipientUserId,
        recipient_device_id: recipientDeviceId,
        ciphertext,
        iv,
        aad,
        cipher_algo: cipherAlgo,
        message_type: messageType,
        client_message_id: clientMessageId,
      },
      select: {
        id: true,
        conversation_id: true,
        group_id: true,
        message_id: true,
        group_message_id: true,
        sender_user_id: true,
        sender_device_id: true,
        recipient_user_id: true,
        recipient_device_id: true,
        message_type: true,
        cipher_algo: true,
        client_message_id: true,
        created_at: true,
      },
    });
    return created;
  }

  async syncEnvelopes(userId: string, payload: {
    deviceId?: string;
    since?: string;
    limit?: number;
    conversationId?: string;
    groupId?: string;
  }) {
    const deviceId = normalizeStr(payload.deviceId, 128);
    const limitRaw = Number(payload.limit ?? 100);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, Math.floor(limitRaw)))
      : 100;
    let sinceDate: Date | null = null;
    if (payload.since) {
      const d = new Date(payload.since);
      sinceDate = Number.isFinite(d.getTime()) ? d : null;
    }
    const conversationId = normalizeStr(payload.conversationId, 64) || null;
    const groupId = normalizeStr(payload.groupId, 64) || null;

    if (!deviceId) throw makeError('deviceId requis', 400);

    const rows = await prisma.encryptedMessageEnvelope.findMany({
      where: {
        OR: [
          { recipient_user_id: userId, recipient_device_id: deviceId },
          { recipient_user_id: userId, recipient_device_id: null },
        ],
        ...(sinceDate ? { created_at: { gt: sinceDate } } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(groupId ? { group_id: groupId } : {}),
      },
      orderBy: { created_at: 'asc' },
      take: limit,
      select: {
        id: true,
        conversation_id: true,
        group_id: true,
        message_id: true,
        group_message_id: true,
        sender_user_id: true,
        sender_device_id: true,
        recipient_user_id: true,
        recipient_device_id: true,
        ciphertext: true,
        iv: true,
        aad: true,
        cipher_algo: true,
        message_type: true,
        client_message_id: true,
        created_at: true,
      },
    });

    const nextSince = rows.length ? rows[rows.length - 1].created_at.toISOString() : (sinceDate ? sinceDate.toISOString() : null);
    return { items: rows, nextSince };
  }

  async getHealthSnapshot() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [devices, prekeysAvailable, envelopesLastHour, envelopesLastDay] = await Promise.all([
      prisma.userE2eeDevice.count().catch(() => 0),
      prisma.userE2eePrekey.count({ where: { consumed_at: null } }).catch(() => 0),
      prisma.encryptedMessageEnvelope.count({ where: { created_at: { gte: oneHourAgo } } }).catch(() => 0),
      prisma.encryptedMessageEnvelope.count({ where: { created_at: { gte: oneDayAgo } } }).catch(() => 0),
    ]);
    const alerts: string[] = [];
    if (devices === 0) alerts.push('no_devices_registered');
    if (prekeysAvailable <= 10) alerts.push('prekeys_low');
    if (envelopesLastHour === 0 && devices > 0) alerts.push('no_recent_e2ee_traffic');
    if (envelopesLastHour > 250000) alerts.push('e2ee_traffic_spike');
    return {
      devices_registered: devices,
      prekeys_available: prekeysAvailable,
      envelopes_last_hour: envelopesLastHour,
      envelopes_last_day: envelopesLastDay,
      healthy: devices > 0 && prekeysAvailable > 0 && alerts.length === 0,
      alerts,
      timestamp: new Date().toISOString(),
    };
  }
}

export default new E2eeService();
