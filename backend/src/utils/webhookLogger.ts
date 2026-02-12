/**
 * Logger dédié pour les webhooks paiement (audit trail)
 */
import { logger } from './logger.js';

export function logWebhookIncoming(provider: string, payload: Record<string, unknown>) {
  logger.info(`[WEBHOOK] ${provider} incoming`, {
    source: 'webhook',
    provider,
    orderId: payload.orderId ?? payload.reference ?? payload.reference_id,
    status: payload.status,
    timestamp: new Date().toISOString(),
  });
}

export function logWebhookProcessed(provider: string, orderId: string, outcome: 'processed' | 'ignored' | 'failed') {
  logger.info(`[WEBHOOK] ${provider} ${outcome}`, {
    source: 'webhook',
    provider,
    orderId,
    outcome,
    timestamp: new Date().toISOString(),
  });
}

export function logWebhookError(provider: string, error: string, payload?: Record<string, unknown>) {
  logger.error(`[WEBHOOK] ${provider} error`, undefined, {
    source: 'webhook',
    provider,
    error,
    orderId: payload?.orderId ?? payload?.reference,
    timestamp: new Date().toISOString(),
  });
}
