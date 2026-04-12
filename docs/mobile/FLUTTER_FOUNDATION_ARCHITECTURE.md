# Flutter Foundation Architecture

This document defines the active Flutter foundation for AfriWonder and ties it to the current repository state.

## Canonical Mobile App

Use `mobile/` as the active Flutter application for the migration work.

Why:

- `mobile/` already contains feature modules for auth, feed, messages, live, marketplace, orders, search, notifications, settings, upload, and push.
- `flutter_app/` is a lighter bootstrap and should not be used as the primary implementation baseline for this migration phase.

## Current Foundation Stack

| Concern | Current implementation | Source |
| --- | --- | --- |
| App entry | `main.dart` with Firebase, Hive, Dio, Socket.IO, Push init | `mobile/lib/main.dart` |
| State management | Riverpod `AsyncNotifier` | `mobile/lib/shared/providers/auth_provider.dart` |
| Navigation | `go_router` | `mobile/lib/core/router/router.dart` |
| HTTP client | `dio` + auth refresh interceptor | `mobile/lib/core/api/dio_client.dart` |
| Secure session | `flutter_secure_storage` | `mobile/lib/core/storage/secure_storage.dart` |
| Realtime | `socket_io_client` | `mobile/lib/core/api/socket_service.dart` |
| Push | Firebase Messaging + local notifications | `mobile/lib/core/push/push_service.dart` |
| Offline cache | Hive | `mobile/lib/main.dart`, `mobile/pubspec.yaml` |
| Media | `video_player`, `agora_rtc_engine` | `mobile/pubspec.yaml` |

## Active Module Layout

```text
mobile/lib/
  core/
    api/
    auth/
    push/
    router/
    storage/
    theme/
  features/
    auth/
    feed/
    live/
    marketplace/
    messages/
    notifications/
    orders/
    profile/
    search/
    settings/
    upload/
  shared/
    models/
    providers/
    widgets/
```

## Foundation Decisions

### 1. Backend Reuse

- Keep the existing Express backend as the single source of truth.
- Align Flutter defaults with `/api`, not `/api/v1`, because the web app and backend route mounting are based on `/api`.
- Reuse existing REST and Socket.IO contracts before adding mobile-only APIs.

### 2. Authentication Flow

- Use secure storage for `accessToken`, `refreshToken`, and `userId`.
- Keep refresh logic in the Dio interceptor.
- Support backend login flexibility by sending `identifier` rather than enforcing email-only login.
- Keep `username` as a first-class required registration field because the backend schema requires it.

### 3. Realtime Session Strategy

- Keep one app-level Socket.IO client.
- Join the personal room through `user:join` after authentication, because the backend currently uses event-based room assignment.
- Join and leave conversation rooms only inside message screens.
- Do not assume backend handshake auth is enough until the backend explicitly validates the socket identity.

### 4. Push Strategy

- Initialize Firebase Messaging at app startup.
- Register the device token with the backend only after an authenticated session exists.
- Route push payloads to feed, live, message, profile, marketplace, cart, or orders using the current `PushService`.

### 5. Navigation Strategy

- Keep guarded routes with `go_router`.
- Redirect anonymous users to `/login`.
- Keep feature-level routes explicit instead of generating them dynamically.

## Required Environment Contract

The `mobile/` app should document and expect these values in `.env`:

- `API_URL`
- `SOCKET_URL`

Recommended local examples:

- Android emulator API: `http://10.0.2.2:3000/api`
- iOS simulator API: `http://127.0.0.1:3000/api`
- Local socket server: `http://10.0.2.2:3000` or `http://127.0.0.1:3000`

## Foundation Issues Closed In This Pass

- Fixed Flutter default API base path to `/api`.
- Fixed registration contract mismatch by adding `username`.
- Fixed login contract mismatch by using backend `identifier`.
- Fixed Socket.IO room sync so authenticated users join `user:{userId}` correctly.
- Fixed push token sync so device token registration is retried after login and session recovery.

## Recommended Next Technical Steps

1. Add typed repositories around raw `Dio` calls for auth, feed, and messages.
2. Add DTO serialization for messages, notifications, and feed responses.
3. Add integration tests for login, session restore, inbox loading, and send message.
4. Unify `mobile/` documentation and stop expanding `flutter_app/` during the MVP phase.
