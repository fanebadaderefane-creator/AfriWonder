/**
 * Push mobile pour réveiller l'app (Android FCM / Expo + iOS VoIP PushKit).
 */
import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { sendVoipIncomingCallToTokens, type VoipCallPayload } from './apnsVoipPush.service.js';

function parseVoipIosToken(endpoint: string): string | null {
  const prefix = 'voip:ios:';
  if (!endpoint.startsWith(prefix)) return null;
  const token = endpoint.slice(prefix.length).trim();
  return token || null;
}

function parseFcmToken(endpoint: string): string | null {
  const prefix = 'fcm:';
  if (!endpoint.startsWith(prefix)) return null;
  const rest = endpoint.slice(prefix.length);
  const i = rest.indexOf(':');
  if (i < 0) return null;
  const token = rest.slice(i + 1).trim();
  return token || null;
}

function isExpoPushToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}

/** Payload data-only pour `_layout.tsx` → `displayIncomingCall`. */
export function buildIncomingCallWakeData(input: {
  callId: string;
  fromUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
}): Record<string, string> {
  return {
    type: 'incoming_call',
    callId: input.callId,
    fromUserId: input.fromUserId,
    callerId: input.fromUserId,
    callType: input.type,
    callMediaType: input.type,
    callerName: input.callerName || 'Contact',
    callerAvatar: input.callerAvatar || '',
  };
}

/**
 * Envoie VoIP PushKit (iOS) + FCM data-only haute priorité (Android natif).
 * Les tokens Expo sont couverts par notificationService avec type `incoming_call`.
 */
export async function dispatchIncomingCallMobileWakePush(input: {
  toUserId: string;
  callId: string;
  fromUserId: string;
  type: 'audio' | 'video';
  callerName?: string;
  callerAvatar?: string;
}): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({
    where: { user_id: input.toUserId, is_active: true },
    select: { endpoint: true },
  });

  const voipTokens: string[] = [];
  const fcmNativeTokens: string[] = [];

  for (const sub of subs) {
    const voip = parseVoipIosToken(sub.endpoint);
    if (voip) {
      voipTokens.push(voip);
      continue;
    }
    const fcm = parseFcmToken(sub.endpoint);
    if (fcm && !isExpoPushToken(fcm)) {
      fcmNativeTokens.push(fcm);
    }
  }

  const voipPayload: VoipCallPayload = {
    callId: input.callId,
    fromUserId: input.fromUserId,
    type: input.type,
    callerName: input.callerName || 'Contact',
    callerAvatar: input.callerAvatar || '',
  };

  if (voipTokens.length > 0) {
    const sent = await sendVoipIncomingCallToTokens(voipTokens, voipPayload);
    logger.info('APNs VoIP incoming call', {
      toUserId: input.toUserId,
      callId: input.callId,
      tokens: voipTokens.length,
      sent,
    });
  }

  if (fcmNativeTokens.length > 0) {
    await sendFcmIncomingCallDataTokens(fcmNativeTokens, buildIncomingCallWakeData(input));
  }
}

async function sendFcmIncomingCallDataTokens(
  tokens: string[],
  data: Record<string, string>,
): Promise<void> {
  try {
    const { messaging } = await import('../config/firebase.js');
    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          data,
          android: {
            priority: 'high' as const,
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { contentAvailable: true } },
          },
        }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    logger.info('FCM incoming_call data push', { tokens: tokens.length, ok });
  } catch (err) {
    logger.warn('FCM incoming_call push skipped (Firebase non configuré ?)', { err });
  }
}
