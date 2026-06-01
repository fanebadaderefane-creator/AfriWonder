/**
 * Journal d’appels dans le fil DM — un message `type=call` par tentative, visible des deux côtés.
 */
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import notificationService from './notification.service.js';
import messageService, { emitToConversationRoom } from './message.service.js';
import {
  buildCallLogContent,
  callLogPreviewLabel,
  parseCallLogContent,
  type CallLogOutcome,
} from '../utils/callLogPayload.js';

export type RecordCallLogInput = {
  callId: string;
  callerId: string;
  receiverId: string;
  media: 'audio' | 'video';
  outcome: CallLogOutcome;
  durationSec?: number;
  startedAt?: Date | null;
  endedAt?: Date | null;
  callerName?: string;
};

async function findExistingCallLogMessage(callId: string) {
  const rows = await prisma.message.findMany({
    where: { type: 'call', content: { contains: `"callId":"${callId}"` } },
    take: 1,
  });
  return rows[0] ?? null;
}

function notificationCopy(
  outcome: CallLogOutcome,
  media: 'audio' | 'video',
  callerName: string,
  durationSec: number,
): { type: string; title: string; message: string } {
  const kind = media === 'video' ? 'vidéo' : 'audio';
  switch (outcome) {
    case 'missed':
      return {
        type: 'call_missed',
        title: 'Appel manqué',
        message: `Appel ${kind} manqué${callerName ? ` · ${callerName}` : ''}`,
      };
    case 'declined':
      return {
        type: 'call_declined',
        title: 'Appel refusé',
        message: `${callerName || 'Votre contact'} a refusé l’appel ${kind}`,
      };
    case 'cancelled':
      return {
        type: 'call_cancelled',
        title: 'Appel annulé',
        message: `Appel ${kind} annulé`,
      };
    case 'completed':
    default: {
      const dur =
        durationSec >= 60
          ? `${Math.floor(durationSec / 60)} min ${durationSec % 60 ? `${durationSec % 60} s` : ''}`.trim()
          : durationSec > 0
            ? `${durationSec} s`
            : '';
      return {
        type: 'call_ended',
        title: 'Appel terminé',
        message: dur ? `Appel ${kind} · ${dur}` : `Appel ${kind} terminé`,
      };
    }
  }
}

/** Idempotent — une seule ligne par callId dans la conversation. */
export async function recordCallLogMessage(input: RecordCallLogInput): Promise<void> {
  const callId = String(input.callId || '').trim();
  const callerId = String(input.callerId || '').trim();
  const receiverId = String(input.receiverId || '').trim();
  if (!callId || !callerId || !receiverId || callerId === receiverId) return;

  const existing = await findExistingCallLogMessage(callId);
  if (existing) return;

  const durationSec = Math.max(0, Math.floor(input.durationSec ?? 0));
  const endedAt = input.endedAt ?? new Date();
  const startedAt =
    input.startedAt ??
    (durationSec > 0 ? new Date(endedAt.getTime() - durationSec * 1000) : null);

  const content = buildCallLogContent({
    callId,
    media: input.media === 'video' ? 'video' : 'audio',
    outcome: input.outcome,
    callerId,
    receiverId,
    durationSec,
    startedAt: startedAt ? startedAt.toISOString() : null,
    endedAt: endedAt.toISOString(),
  });

  try {
    const conversation = await messageService.getOrCreateConversation(callerId, receiverId);
    const preview = callLogPreviewLabel(input.outcome, input.media === 'video' ? 'video' : 'audio');

    const message = await prisma.message.create({
      data: {
        conversation_id: conversation.id,
        sender_id: callerId,
        content,
        type: 'call',
        status: 'sent',
      },
      include: {
        sender: { select: { id: true, username: true, full_name: true, profile_image: true } },
      },
    });

    const prevMap = (conversation.unread_count_map as Record<string, number>) || {};

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        last_message_id: message.id,
        last_message_text: preview.slice(0, 200),
        last_message_at: message.created_at,
        unread_count_map: prevMap,
      },
    });

    emitToConversationRoom(conversation.id, 'message:new', message);

    const callerName = (input.callerName || '').trim();
    const notifyCaller = notificationCopy(input.outcome, input.media, callerName, durationSec);
    const notifyReceiver = notificationCopy(input.outcome, input.media, callerName, durationSec);

    if (input.outcome === 'declined') {
      await notificationService.create(callerId, {
        type: 'call_declined',
        title: 'Appel refusé',
        message: `Votre appel ${input.media === 'video' ? 'vidéo' : 'audio'} a été refusé`,
        reference_type: 'direct_call',
        reference_id: callId,
        data: { callId, callerId, callMediaType: input.media, outcome: input.outcome },
      });
    } else if (input.outcome === 'cancelled') {
      await notificationService.create(receiverId, {
        type: 'call_cancelled',
        title: 'Appel annulé',
        message: `${callerName || 'Un contact'} a annulé l’appel ${input.media === 'video' ? 'vidéo' : 'audio'}`,
        reference_type: 'direct_call',
        reference_id: callId,
        data: { callId, callerId, callMediaType: input.media, outcome: input.outcome },
      });
    } else if (input.outcome === 'completed') {
      for (const uid of [callerId, receiverId]) {
        await notificationService.create(uid, {
          type: 'call_ended',
          title: notifyCaller.title,
          message: notifyCaller.message,
          reference_type: 'direct_call',
          reference_id: callId,
          data: { callId, callerId, callMediaType: input.media, outcome: input.outcome, durationSec },
        });
      }
    } else if (input.outcome === 'missed') {
      await notificationService.create(receiverId, {
        type: 'call_missed',
        title: 'Appel manqué',
        message: `Appel ${input.media === 'video' ? 'vidéo' : 'audio'} manqué${callerName ? ` · ${callerName}` : ''}`,
        reference_type: 'direct_call',
        reference_id: callId,
        data: { callId, callerId, callMediaType: input.media, outcome: input.outcome },
      });
      await notificationService.create(callerId, {
        type: 'call_missed',
        title: 'Appel sans réponse',
        message: `${callerName ? '' : 'Votre contact '}n’a pas répondu`,
        reference_type: 'direct_call',
        reference_id: callId,
        data: { callId, callerId, callMediaType: input.media, outcome: input.outcome },
      });
    }
  } catch (err) {
    logger.warn('recordCallLogMessage failed', { callId, outcome: input.outcome, err });
  }
}

/** Met à jour la durée si le message existe déjà (ex. session-state après socket). */
export async function patchCallLogDuration(callId: string, durationSec: number): Promise<void> {
  const row = await findExistingCallLogMessage(callId);
  if (!row) return;
  const parsed = parseCallLogContent(row.content);
  if (!parsed || parsed.outcome !== 'completed') return;
  if (parsed.durationSec >= durationSec) return;
  const next = buildCallLogContent({ ...parsed, durationSec });
  await prisma.message.update({ where: { id: row.id }, data: { content: next } });
}
