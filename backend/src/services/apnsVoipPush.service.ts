/**
 * Push APNs VoIP (PushKit) — réveille l'app iOS tuée pour afficher CallKit < 5 s.
 * Variables Render : APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (PEM, \\n échappés),
 * APNS_BUNDLE_ID (ex. com.afriwonder.app), APNS_USE_SANDBOX=true pour builds dev.
 */
import http2 from 'node:http2';
import { importPKCS8, SignJWT } from 'jose';
import { logger } from '../utils/logger.js';

export type VoipCallPayload = {
  callId: string;
  fromUserId: string;
  type: 'audio' | 'video';
  callerName: string;
  callerAvatar?: string;
};

let cachedJwt: { token: string; exp: number } | null = null;

function apnsPrivateKeyPem(): string | null {
  const raw = process.env.APNS_PRIVATE_KEY?.trim();
  if (!raw) return null;
  return raw.replace(/\\n/g, '\n');
}

async function getApnsAuthToken(): Promise<string | null> {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const keyPem = apnsPrivateKeyPem();
  if (!keyId || !teamId || !keyPem) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.exp > now + 120) return cachedJwt.token;

  try {
    const key = await importPKCS8(keyPem, 'ES256');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .sign(key);
    cachedJwt = { token, exp: now + 3300 };
    return token;
  } catch (err) {
    logger.warn('APNs JWT generation failed', { err });
    return null;
  }
}

function apnsHost(): string {
  const sandbox =
    process.env.APNS_USE_SANDBOX === 'true'
    || process.env.APNS_USE_SANDBOX === '1'
    || process.env.NODE_ENV !== 'production';
  return sandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
}

function voipTopic(): string {
  const bundle = (process.env.APNS_BUNDLE_ID || 'com.afriwonder.app').trim();
  return `${bundle}.voip`;
}

/** Envoie un push VoIP à un device token PushKit iOS. */
export async function sendVoipPushToDevice(
  deviceToken: string,
  payload: VoipCallPayload,
): Promise<boolean> {
  const token = deviceToken.trim();
  if (!token) return false;

  const auth = await getApnsAuthToken();
  if (!auth) {
    if (!process.env.APNS_VOIP_WARNED) {
      process.env.APNS_VOIP_WARNED = '1';
      logger.warn(
        'APNs VoIP non configuré — app iOS tuée ne recevra pas CallKit. '
          + 'Définir APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY sur Render.',
      );
    }
    return false;
  }

  const body = JSON.stringify({
    aps: { 'content-available': 1 },
    callId: payload.callId,
    uuid: payload.callId,
    fromUserId: payload.fromUserId,
    callerUserId: payload.fromUserId,
    type: payload.type,
    callerName: payload.callerName,
    callerAvatar: payload.callerAvatar || '',
  });

  return new Promise((resolve) => {
    const client = http2.connect(`https://${apnsHost()}`);
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        client.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    client.on('error', (err) => {
      logger.warn('APNs VoIP connection error', { err });
      finish(false);
    });

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${auth}`,
      'apns-topic': voipTopic(),
      'apns-push-type': 'voip',
      'apns-priority': '10',
      'apns-expiration': '0',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });

    req.on('response', (headers) => {
      const status = Number(headers[':status'] || 0);
      if (status >= 400) {
        logger.warn('APNs VoIP rejected', { status, tokenPrefix: token.slice(0, 8) });
        finish(false);
      }
    });

    req.setEncoding('utf8');
    let resBody = '';
    req.on('data', (chunk) => {
      resBody += chunk;
    });
    req.on('end', () => {
      if (resBody) logger.warn('APNs VoIP response body', { resBody });
      finish(true);
    });
    req.on('error', (err) => {
      logger.warn('APNs VoIP request error', { err });
      finish(false);
    });

    req.write(body);
    req.end();
  });
}

export async function sendVoipIncomingCallToTokens(
  tokens: string[],
  payload: VoipCallPayload,
): Promise<number> {
  if (!tokens.length) return 0;
  const results = await Promise.allSettled(
    tokens.map((t) => sendVoipPushToDevice(t, payload)),
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
}
