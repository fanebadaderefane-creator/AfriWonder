/**
 * Événements Socket.IO émis par le backend (`live.service.ts`) vers la room `stream:{streamId}`.
 * Le client rejoint via `socketService.joinLiveStream(streamId)` ; `socketService` relaie tout événement `live:*`.
 */
export const LIVE_SOCKET_EVENTS = [
  'live:viewers',
  'live:started',
  'live:tip',
  'live:gift',
  'live:chat:clear',
  'live:chat',
  'live:like',
  'live:ended',
  'live:banned',
  'live:chat:updated',
  'live:pin',
  'live:poll:created',
  'live:poll:updated',
  'live:poll:ended',
  'live:cohost:invited',
  'live:cohost:accepted',
  'live:cohost:removed',
  'live:raise-hand',
  /** Sous-titres / légendes hôte (CDC 6.2) — payload `{ text, at }`. */
  'live:caption',
  /** Après accept/refus main levée — payload `{ userId, accepted? }` ou `{ streamId, accepted }` côté user. */
  'live:raise-hand:resolved',
  'live:raise-hand:rejected',
] as const;

export type LiveSocketEventName = (typeof LIVE_SOCKET_EVENTS)[number];
