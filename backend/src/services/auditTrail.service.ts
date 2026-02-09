import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

export interface AuditEventInput {
  event_type: string;
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  payload?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        event_type: input.event_type,
        actor_id: input.actor_id,
        target_type: input.target_type,
        target_id: input.target_id,
        payload: input.payload,
        ip_address: input.ip_address,
        user_agent: input.user_agent,
      },
    });
  } catch (e) {
    logger.error('Audit event log failed', { event_type: input.event_type, error: e });
  }
}

export function auditFromRequest(
  req: { user?: { id: string }; headers: Record<string, string>; socket?: { remoteAddress?: string } },
  eventType: string,
  targetType?: string,
  targetId?: string,
  payload?: Record<string, unknown>
) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  return logAuditEvent({
    event_type: eventType,
    actor_id: req.user?.id,
    target_type: targetType,
    target_id: targetId,
    payload,
    ip_address: ip,
    user_agent: req.headers['user-agent'],
  });
}
