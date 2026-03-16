/**
 * AfriWonder Event Bus — in-memory implementation, Kafka-ready interface.
 * Use for decoupling domains (recommendation, analytics, notifications).
 * In production, replace emit() with Kafka producer; keep same interface.
 */

import { randomUUID } from 'crypto';
import type { DomainEvent, EventPayload } from './types.js';

// Re-export for subscribers
export type { DomainEvent, EventPayload } from './types.js';
import { logger } from '../utils/logger.js';

const EVENT_VERSION = '1.0';

type Handler = (event: DomainEvent) => void | Promise<void>;

const handlers = new Map<string, Handler[]>();

function topic(domain: string, entity: string, action: string): string {
  return `afriwonder.${domain}.${entity}.${action}`;
}

/**
 * Subscribe to a topic (e.g. "afriwonder.video.video.viewed").
 * Handlers are called asynchronously; errors are logged and do not break other handlers.
 */
export function subscribe(topicKey: string, handler: Handler): () => void {
  if (!handlers.has(topicKey)) handlers.set(topicKey, []);
  handlers.get(topicKey)!.push(handler);
  return () => {
    const list = handlers.get(topicKey);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
  };
}

/**
 * Emit an event. In-memory: runs handlers in background (non-blocking).
 * Later: also send to Kafka topic for cross-service consumers.
 */
export function emit<T extends EventPayload>(
  domain: string,
  entity: string,
  action: string,
  payload: T
): void {
  const event: DomainEvent<T> = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    version: EVENT_VERSION,
    domain: domain as DomainEvent['domain'],
    entity,
    action,
    payload,
  };

  const topicKey = topic(domain, entity, action);
  const list = handlers.get(topicKey);
  if (list?.length) {
    setImmediate(() => {
      for (const h of list) {
        Promise.resolve(h(event as DomainEvent)).catch((err) => {
          logger.error('Event handler error', { topic: topicKey, eventId: event.eventId, error: err });
        });
      }
    });
  }

  // Future: Kafka producer
  // if (kafkaProducer) kafkaProducer.send({ topic: topicKey, messages: [{ value: JSON.stringify(event) }] }).catch(logger.error);
}

/** Topic name for video.viewed (subscribe with this key). */
export const TOPIC_VIDEO_VIEWED = topic('video', 'video', 'viewed');
export const TOPIC_VIDEO_PUBLISHED = topic('video', 'video', 'published');
export const TOPIC_USER_REGISTERED = topic('user', 'user', 'registered');
export const TOPIC_USER_LOGIN = topic('user', 'user', 'login');
export const TOPIC_PAYMENT_COMPLETED = topic('payment', 'transaction', 'completed');
export const TOPIC_ORDER_COMPLETED = topic('order', 'order', 'completed');
