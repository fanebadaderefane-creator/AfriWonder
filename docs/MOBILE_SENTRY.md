# Sentry — application Expo (`frontend/`)

Le backend (`backend/src/config/sentry.ts`) et la PWA (`src/main.jsx`, `VITE_SENTRY_DSN`) supportent déjà Sentry. **L’app Expo** inclut désormais `@sentry/react-native` avec initialisation **conditionnelle**.

## Comportement

| Condition | Effet |
|-----------|--------|
| Pas de `EXPO_PUBLIC_SENTRY_DSN` | Aucun envoi (pas d’initialisation). |
| `__DEV__` (Metro) sans `EXPO_PUBLIC_SENTRY_DEBUG=1` | Pas d’initialisation (évite bruit / quotas). |
| DSN défini + build release **ou** `EXPO_PUBLIC_SENTRY_DEBUG=1` | `Sentry.init` au démarrage (`app/_layout.tsx` → `initMobileSentry()`). |

## Fichiers

- Plugin Expo : `app.json` → `"@sentry/react-native"` dans `plugins`.
- Code : `frontend/src/lib/sentryMobile.ts` (export `initMobileSentry`).
- Point d’entrée : `frontend/app/_layout.tsx` (appel après les imports).
- Variables : `frontend/.env.example` (`EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DEBUG`, `EXPO_PUBLIC_APP_ENV`).
- Tests : `frontend/src/lib/sentryMobile.test.ts`.

## EAS / production

1. Créer un projet Sentry (plateforme *React Native*).
2. Ajouter `EXPO_PUBLIC_SENTRY_DSN` dans les **secrets EAS** du profil `production` / `preview`.
3. Lancer un build natif (`eas build`) : le plugin configure le SDK natif pour les crashs hors JS.

Référence officielle : [Using Sentry — Expo](https://docs.expo.dev/guides/using-sentry/).
