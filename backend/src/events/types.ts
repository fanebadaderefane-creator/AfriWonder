/**
 * Event payload types for AfriWonder event-driven architecture.
 * Topics follow: afriwonder.<domain>.<entity>.<action>
 * Used by eventBus (in-memory now, Kafka-ready later).
 */

export type Domain = 'user' | 'video' | 'content' | 'message' | 'payment' | 'order' | 'media' | 'live' | 'moderation';

export interface BaseEvent {
  eventId: string;
  timestamp: string; // ISO
  version: string;
  domain: Domain;
  entity: string;
  action: string;
}

// --- User ---
export interface UserRegisteredPayload {
  userId: string;
  email: string;
  username: string;
  country?: string;
}

export interface UserLoginPayload {
  userId: string;
  username: string;
  ip?: string;
}

export interface UserUpdatedPayload {
  userId: string;
  fields: string[];
}

// --- Video ---
export interface VideoViewedPayload {
  videoId: string;
  creatorId: string;
  userId?: string;
  deviceId?: string;
  watchSeconds: number;
  watchPercent: number;
  views: number;
}

export interface VideoPublishedPayload {
  videoId: string;
  creatorId: string;
  title: string;
  category?: string;
}

// --- Content ---
export interface LikePayload {
  videoId: string;
  userId: string;
  liked: boolean;
}

export interface CommentPayload {
  commentId: string;
  videoId: string;
  userId: string;
}

// --- Message ---
export interface MessageSentPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  hasMedia: boolean;
}

// --- Payment ---
export interface PaymentCompletedPayload {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  type: string;
}

// --- Order (Marketplace) ---
export interface OrderCompletedPayload {
  orderId: string;
  buyerId: string;
  sellerId: string;
  total: number;
  currency: string;
}

export type EventPayload =
  | UserRegisteredPayload
  | UserLoginPayload
  | UserUpdatedPayload
  | VideoViewedPayload
  | VideoPublishedPayload
  | LikePayload
  | CommentPayload
  | MessageSentPayload
  | PaymentCompletedPayload
  | OrderCompletedPayload;

export interface DomainEvent<T extends EventPayload = EventPayload> extends BaseEvent {
  payload: T;
}
