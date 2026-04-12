# Flutter MVP Contract Matrix

This document maps the first Flutter MVP scope to the existing PWA contracts, the current Flutter implementation in `mobile/`, and the backend endpoints that must stay stable.

## MVP Scope

The first mobile delivery covers:

- Authentication and session recovery
- Home feed and basic video interactions
- Messaging baseline: inbox, conversation read/send, presence
- Push token registration for signed-in users

## Delivery Baseline

- Flutter codebase to keep: `mobile/`
- Web contract reference: `src/api/expressClient.js`
- Backend route map: `backend/src/app.ts`

## Auth

| Area | Web reference | Flutter reference | Backend contract | Data/state | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `src/lib/AuthContext.jsx` | `mobile/lib/features/auth/login_page.dart`, `mobile/lib/core/auth/auth_service.dart` | `POST /api/auth/login` | `AppUser`, secure tokens, Riverpod `authProvider` | Implemented | Flutter now sends `identifier` instead of email-only so it matches backend login. |
| Register | `src/lib/AuthContext.jsx` | `mobile/lib/features/auth/register_page.dart`, `mobile/lib/core/auth/auth_service.dart` | `POST /api/auth/register` | `AppUser`, secure tokens | Implemented | Flutter now sends `username`, which is required by `backend/src/routes/auth.routes.ts`. |
| Refresh | `src/api/expressClient.js` | `mobile/lib/core/api/dio_client.dart` | `POST /api/auth/refresh` | secure storage access/refresh tokens | Implemented | Flutter interceptor now targets `/api` instead of `/api/v1`. |
| Current user | `src/lib/AuthContext.jsx` | `mobile/lib/core/auth/auth_service.dart`, `mobile/lib/shared/providers/auth_provider.dart` | `GET /api/auth/me` | `AppUser`, persisted `userId` | Implemented | `userId` is now re-saved during `me()` for socket room recovery after restart. |
| Logout | `src/lib/AuthContext.jsx` | `mobile/lib/core/auth/auth_service.dart`, `mobile/lib/shared/providers/auth_provider.dart` | `POST /api/auth/logout` | clear secure storage, clear socket room | Implemented | Logout now leaves the joined Socket.IO user room via sync. |

## Home And Feed

| Area | Web reference | Flutter reference | Backend contract | Data/state | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Feed listing | `src/pages/Home.jsx` | `mobile/lib/features/feed/feed_page.dart` | `GET /api/feed` | `Video`, local page state | Implemented | Treat this as the baseline feed surface for MVP. |
| Watch analytics | `src/pages/Home.jsx` | `mobile/lib/features/feed/feed_page.dart` | `POST /api/feed/watch-event` | fire-and-forget event | Implemented | Keep payload contract aligned with web analytics. |
| Like video | `src/components/video/VideoCard.jsx` | `mobile/lib/features/feed/video_slide.dart` | `POST /api/videos/:id/like`, `DELETE /api/videos/:id/like` | local optimistic UI in page state | Implemented | Mobile reuses simple like endpoints instead of web player logic. |
| Feed post composer | `src/pages/FeedPosts.jsx` style flow | `mobile/lib/features/feed/feed_posts_page.dart` | `GET /api/posts`, `POST /api/posts`, `POST/DELETE /api/posts/:id/like` | local page state | Optional for MVP | Present in Flutter, but secondary to video feed MVP. |

## Messaging Baseline

| Area | Web reference | Flutter reference | Backend contract | Data/state | Socket events | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inbox | `src/pages/Inbox.jsx` | `mobile/lib/features/messages/inbox_page.dart` | `GET /api/messages/conversations` | conversation list state | `user:join` for personal room | Implemented | Depends on successful user room join after auth. |
| Open conversation | `src/pages/Chat.jsx` | `mobile/lib/features/messages/chat_page.dart` | `GET /api/messages/conversations/id/:conversationId` | conversation header state | `message:join-conversation` | Implemented | Uses backend conversation id contract directly. |
| Read message history | `src/pages/Chat.jsx` | `mobile/lib/features/messages/chat_page.dart` | `GET /api/messages/:conversationId` | message list state | `message:new` listener | Implemented | Cursor pagination is still basic and can be improved later. |
| Mark as read | `src/pages/Chat.jsx` | `mobile/lib/features/messages/chat_page.dart` | `PUT /api/messages/:conversationId/read` | no model change required | server emits read updates | Implemented | Matches current REST flow. |
| Send message | `src/pages/Chat.jsx` | `mobile/lib/features/messages/chat_page.dart` | `POST /api/messages/send` | local append + server event | `message:new` | Implemented | Current MVP uses text and simple message payloads. |
| Presence | `src/pages/Chat.jsx` | currently indirect | `GET /api/messages/presence/:userId` | presence badge state | `user:join`, `user:leave` | Partial | Backend supports it; Flutter can expose it in conversation header after MVP stabilization. |
| Group chat | `src/pages/GroupChat.jsx` | `mobile/lib/features/messages/group_chat_page.dart` | group message endpoints under `/api/messages/group/...` | group state | `message:join-group`, `message:new` | Out of MVP core | Already scaffolded, but not required for first MVP sign-off. |

## Notifications And Push

| Area | Web reference | Flutter reference | Backend contract | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| In-app notifications list | `src/pages/Notifications.jsx` | `mobile/lib/features/notifications/notifications_page.dart` | `GET /api/notifications`, `PUT /api/notifications/read-all` | Implemented | Useful as supporting feature, not a blocker for MVP. |
| Mobile push token registration | `src/components/common/PushNotificationService.jsx` | `mobile/lib/core/push/push_service.dart` | `POST /api/notifications/device-token` | Implemented | Flutter now retries registration after authentication, not just at startup. |

## MVP Acceptance Gates

The MVP is considered executable when all of the following are true:

1. A user can register, login, restart the app, and remain authenticated.
2. The app can load the main feed from the existing backend with the same base API path as web.
3. A signed-in user joins the correct Socket.IO personal room and can receive message events.
4. Inbox, conversation history, and send message work against the current backend contracts.
5. Firebase device token registration happens only after a valid authenticated session is available.

## Immediate Gaps After This Pass

- Add explicit inbox unread count sync to mirror the web header contract.
- Add typed DTO wrappers around the message and notification responses instead of raw maps.
- Add pagination helpers for conversations and message history.
- Decide whether `mobile/lib/features/feed/feed_posts_page.dart` stays inside MVP or moves to phase 2 social scope.
