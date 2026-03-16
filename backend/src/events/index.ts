/**
 * AfriWonder Event Bus — public API.
 * Use emit() from services; use subscribe() in workers or future microservices.
 */

export { emit, subscribe, TOPIC_VIDEO_VIEWED, TOPIC_VIDEO_PUBLISHED, TOPIC_USER_REGISTERED, TOPIC_USER_LOGIN, TOPIC_PAYMENT_COMPLETED, TOPIC_ORDER_COMPLETED } from './eventBus.js';
export type { DomainEvent, EventPayload, Domain } from './types.js';
