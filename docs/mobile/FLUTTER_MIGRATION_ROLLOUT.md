# Flutter Migration Rollout

This roadmap turns the migration plan into deliverable execution phases without replacing the current backend or disrupting the PWA.

## Execution Principle

- Keep the existing web app live.
- Build the native mobile experience in `mobile/`.
- Reuse backend contracts first.
- Add mobile-specific backend work only when a native need is proven.

## Phase 0: Stabilize The Mobile Foundation

Goal:

- Ensure the current Flutter base can authenticate, restore session, join user socket rooms, and register device tokens reliably.

Outputs:

- `mobile/` confirmed as the canonical Flutter codebase
- auth contract aligned with backend login/register
- socket room sync aligned with `backend/src/index.ts`
- push token registration retried after authentication
- foundation documentation added under `docs/mobile/`

Exit criteria:

- Login works with the current backend
- Register works with backend-required `username`
- Restarted sessions rehydrate and rejoin the correct user room
- API default path matches `/api`

## Phase 1: MVP Mobile

Goal:

- Deliver a first useful mobile product around auth, feed, and messaging.

Scope:

- Authentication
- Home feed
- Video like and watch tracking
- Inbox
- Conversation view
- Send and read messages
- Push token registration

Recommended QA:

1. Login on a fresh install.
2. Register a new user.
3. Kill and relaunch the app to verify session restore.
4. Open inbox and load conversation history.
5. Send a direct message and verify realtime delivery.
6. Receive and open a push notification while authenticated.

## Phase 2: Social And Notifications

Goal:

- Reach parity on the most visible social surfaces after the MVP is stable.

Scope:

- Profile
- Notifications center
- Search and discover
- Follow flows
- Saved and starred content as needed

Backend focus:

- unread counters
- compact payloads only if performance demands them

## Phase 3: Commerce

Goal:

- Expand the mobile app into marketplace and transaction flows.

Scope:

- Marketplace listing
- Product details
- Cart
- Checkout
- Orders
- Order tracking

Backend focus:

- mobile payment UX
- redirect/webview checkout handling
- order timeline usability on mobile

## Phase 4: Live

Goal:

- Rebuild the live experience with Flutter-native media and Agora SDKs.

Scope:

- Live discovery
- Viewer experience
- Host experience
- Live chat, likes, gifts, and session heartbeat

Backend focus:

- confirm token contracts
- validate stream lifecycle endpoints
- harden push notifications for live start and replay

## Phase 5: Super-App Verticals

Goal:

- Migrate additional domains only after the common social and commerce foundation is proven.

Candidate domains:

- transport
- real estate
- insurance
- health
- ticketing
- utilities

Execution rule:

- Migrate by business vertical, not by random page order.

## Governance Rules

- `mobile/` is the active implementation target during this migration.
- `flutter_app/` should not receive new product scope during the MVP rollout.
- Backend modifications must stay additive and documented.
- Web and mobile contracts should remain compatible during the transition.

## Release Order

1. Internal MVP build for auth, feed, and messages.
2. Closed beta with push notifications and crash monitoring.
3. Beta expansion with social and notifications parity.
4. Commerce rollout.
5. Live rollout.
6. Super-app vertical rollout by priority.

## Tracking Artifacts

Use these documents together:

- `docs/mobile/FLUTTER_MVP_CONTRACT_MATRIX.md`
- `docs/mobile/FLUTTER_FOUNDATION_ARCHITECTURE.md`
- `docs/mobile/BACKEND_MOBILE_API_SPEC.md`
- `mobile/README.md`
