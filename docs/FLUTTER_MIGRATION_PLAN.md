# Flutter Migration Plan - AfriWonder

## Objective

Build the mobile app with Flutter (single codebase iOS/Android) while reusing the current backend with minimal risk.

## Scope

- Mobile client: Flutter (`mobile_flutter`)
- Backend: existing Express/Prisma API (`backend`)
- Reuse existing auth, feed, upload, social, messaging endpoints where compatible
- Add only missing APIs for mobile-specific features

## Architecture decisions

- **Mobile stack**
  - Flutter stable
  - State management: Riverpod (recommended) or Bloc
  - Networking: Dio
  - Local cache: Hive/Isar
  - Secure storage: `flutter_secure_storage`
  - Push notifications: Firebase Cloud Messaging
- **Backend strategy**
  - Keep existing API contracts as baseline
  - Introduce versioned mobile endpoints only when needed (`/api/mobile/*`)
  - Avoid breaking existing web/PWA behavior

## Delivery phases

### Phase 1 - Foundation (1-2 weeks)

- Flutter project setup and environments (`dev`, `staging`, `prod`)
- Auth flow (login/register/refresh/me) connected to existing backend
- App shell: routing, theme, error handling, crash reporting
- Network layer with token refresh interceptor

### Phase 2 - Core product parity (2-4 weeks)

- Feed video screen
- Profile and social actions (follow/like/comment/share)
- Upload flow (multipart and direct upload compatibility)
- Notifications inbox

### Phase 3 - Mobile quality (2-3 weeks)

- Offline minimum mode (cached feed + retry queue)
- Push notifications end-to-end
- Performance tuning (startup, scrolling, media buffering)
- QA device matrix and crash budget

## Backend reuse checklist

- [ ] JWT auth endpoints stable for mobile
- [ ] Refresh token behavior validated on intermittent network
- [ ] Feed endpoints support pagination/cursor suited for mobile scroll
- [ ] Upload endpoints tested on unstable network
- [ ] Notification endpoints + push token registration available
- [ ] Rate limit and timeout tuned for mobile latency

## Candidate mobile-specific APIs

- `POST /api/mobile/devices/register`
  - Register device, push token, app version, locale
- `POST /api/mobile/devices/unregister`
  - Invalidate push token at logout
- `GET /api/mobile/bootstrap`
  - Return user + feature flags + minimal config in one call
- `POST /api/mobile/events/batch`
  - Batch analytics events to reduce radio/network cost

## Quality gates

- Cold start < 2s on a correct network (mid-range Android target)
- Feed swipe stable with no blocking spinner loops
- Upload success rate >= 99% on medium network profile
- Session/login blocking bugs = 0 in release candidate

## Risks and mitigations

- **Risk:** API mismatch between web payloads and mobile needs
  - **Mitigation:** define DTO layer in Flutter and backend contract tests
- **Risk:** upload failures on weak network
  - **Mitigation:** resumable upload strategy and background retry queue
- **Risk:** notification inconsistency
  - **Mitigation:** device registration API + token lifecycle handling

## Immediate next actions

1. Validate API compatibility on `auth`, `feed`, `videos`, `notifications`.
2. Implement `mobile/devices/register` backend route.
3. Build Flutter auth + feed vertical slice.
4. Run QA on 3 Android devices + 1 iOS simulator.
