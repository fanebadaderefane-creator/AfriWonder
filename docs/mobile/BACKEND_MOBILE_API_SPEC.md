# Backend Mobile API Spec

This document separates what the current backend already supports for Flutter from what should be added or hardened for mobile-native delivery.

## Existing Backend Reuse

The current backend can already support the first Flutter MVP without major architecture changes.

### Reusable Now

| Capability | Backend source | Current status |
| --- | --- | --- |
| JWT auth with body refresh token | `backend/src/routes/auth.routes.ts` | Reusable now |
| Bearer token extraction | `backend/src/middleware/auth.ts` | Reusable now |
| REST JSON responses | `backend/src/app.ts` and route modules | Reusable now |
| Conversations, messages, send/read flows | `backend/src/routes/messages.routes.ts` | Reusable now |
| Socket.IO message and room events | `backend/src/index.ts` | Reusable now |
| Notifications list/read flows | `backend/src/routes/notifications.routes.ts` | Reusable now |
| Device token registration for Flutter | `backend/src/routes/notifications.routes.ts` at `POST /device-token` | Already present |
| Live discovery and stream token flows | `backend/src/routes/live.routes.ts` | Reusable in later phases |
| Upload presign and multipart media flows | `backend/src/routes/upload.routes.ts` | Reusable in later phases |

## MVP Mobile Contract

No mandatory backend rewrite is required for the first Flutter MVP if the following contracts remain stable:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/feed`
- `POST /api/feed/watch-event`
- `GET /api/messages/conversations`
- `GET /api/messages/conversations/id/:conversationId`
- `GET /api/messages/:conversationId`
- `PUT /api/messages/:conversationId/read`
- `POST /api/messages/send`
- `GET /api/notifications`
- `PUT /api/notifications/read-all`
- `POST /api/notifications/device-token`

## Backend Hardening Recommended For Mobile

These are controlled additions, not architecture changes.

### 1. Socket Identity Hardening

Current situation:

- The backend joins user rooms from the client-emitted `user:join` event in `backend/src/index.ts`.
- This works, but the server is not yet binding the socket identity to the authenticated JWT at connection time.

Recommended change:

- Add Socket.IO auth middleware that validates the bearer token during connection.
- Resolve the authenticated user id server-side and ignore arbitrary `user:join` payloads from the client.
- Keep room naming as `user:{userId}` so the message service remains unchanged.

Suggested outcome:

- Presence, calls, and direct message events become trustworthy for mobile and web.

### 2. Device Token Lifecycle

Current situation:

- `POST /api/notifications/device-token` exists and stores a mobile token inside `PushSubscription`.

Recommended additions:

- Add `DELETE /api/notifications/device-token` to deactivate a specific mobile token on logout or uninstall recovery.
- Add optional `PUT /api/notifications/device-token` if you want explicit token rotation semantics.
- Store `platform`, `appVersion`, and `deviceId` as searchable metadata if the Prisma model is extended later.

### 3. App Version Awareness

Recommended addition:

- Accept and log `X-App-Version`, `X-App-Build`, and `X-Device-Id` headers for mobile requests.

Why:

- Makes it easier to diagnose store-rollout regressions without changing route payloads.

### 4. Lightweight Mobile Payloads

Not required for MVP, but recommended when traffic grows:

- Add trimmed mobile feed payloads if web responses become too heavy.
- Add reduced conversation list payloads if inbox performance degrades on low-end devices.
- Add optional `fields` or `compact=true` query flags instead of duplicating route families too early.

## Push Delivery Notes

The backend already includes the main mobile push prerequisites:

- Firebase Admin wiring in `backend/src/config/firebase.ts`
- device token route in `backend/src/routes/notifications.routes.ts`
- notification service logic in `backend/src/services/notification.service.ts`

Recommended discipline:

1. Keep one mobile token registration endpoint.
2. Normalize push payload shape across like, comment, follow, live, message, product, cart, and order events.
3. Ensure all push payloads include a stable `type` and `id`, because the Flutter router already depends on that convention.

## Non-MVP Backend Work

These should stay outside the first MVP unless explicitly pulled forward:

- Full E2EE parity for mobile
- Live host moderation parity
- Rich group chat management
- Upload retry orchestration and offline media queues
- Payment-specific native checkout contracts

## Delivery Rule

For this migration, treat backend changes as additive and minimal:

- Keep the existing backend architecture.
- Add only the mobile-native APIs or hardening layers that unblock Flutter.
- Avoid route churn that would break the current PWA while the migration is in progress.
