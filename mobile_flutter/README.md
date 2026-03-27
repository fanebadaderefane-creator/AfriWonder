# AfriWonder Mobile (Flutter)

Flutter client for iOS and Android that reuses the current AfriWonder backend.

## Prerequisites

- Flutter stable installed
- Backend running on `http://localhost:3000`

## Run in development

```bash
cd mobile_flutter
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Notes:

- `10.0.2.2` is for Android emulator to access host machine.
- For iOS simulator, use:
  - `--dart-define=API_BASE_URL=http://127.0.0.1:3000/api`
- For physical device, use LAN IP of your machine.

## Backend reuse strategy

- Reuse existing APIs first (`auth`, `feed`, `videos`, `notifications`)
- Add only missing mobile-specific endpoints in `backend`
- Keep web/PWA behavior unchanged

## Near-term roadmap

1. Auth integration (login/refresh/me)
2. Feed integration
3. Device registration API for push notifications
4. Offline minimum cache and retry queue

## Reference

- Migration plan: `docs/FLUTTER_MIGRATION_PLAN.md`
