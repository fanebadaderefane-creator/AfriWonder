# Sentry — application Expo (`frontend/`)

Le backend (`backend/src/config/sentry.ts`) et la PWA (`src/main.jsx`, `VITE_SENTRY_DSN`) supportent déjà Sentry. **L’app Expo** inclut désormais `@sentry/react-native` avec initialisation **conditionnelle**.

## Comportement

| Condition | Effet |
|-----------|--------|
| Pas de `EXPO_PUBLIC_SENTRY_DSN` | Aucun envoi (pas d’initialisation). |
| `__DEV__` (Metro) sans `EXPO_PUBLIC_SENTRY_DEBUG=1` | Pas d’initialisation (évite bruit / quotas). |
| DSN défini + build release **ou** `EXPO_PUBLIC_SENTRY_DEBUG=1` | `Sentry.init` au démarrage (`app/_layout.tsx` → `initMobileSentry()`). |

## Fichiers

- Code : `frontend/src/lib/sentryMobile.ts` (export `initMobileSentry`).
- Point d’entrée : `frontend/app/_layout.tsx` (appel `initMobileSentry()`).
- Dépendance : `frontend/package.json` → `@sentry/react-native`.
- Variables : `frontend/.env.example` (`EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DEBUG`, `EXPO_PUBLIC_APP_ENV`).
- Tests : `frontend/src/lib/sentryMobile.test.ts`.

**Ne jamais committer le DSN** (pas dans Git, pas dans Slack public). En cas d’exposition : Sentry → *Settings → Client Keys (DSN)* → **Regenerate**.

## EAS / production

1. Créer un projet Sentry (plateforme *React Native*).
2. Copier le DSN (une seule ligne `https://…@…ingest…sentry.io/…`).
3. Secret EAS (depuis `frontend/`, compte Expo du projet) :
   `eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "COLLEZ_VOTRE_DSN_ICI"`
   (ou **expo.dev** → projet → **Environment variables** / secrets pour preview + production).
4. `eas build` (Android / iOS) : le DSN est injecté via `eas.json` (`"EXPO_PUBLIC_SENTRY_DSN": "$EXPO_PUBLIC_SENTRY_DSN"`) pour les profils **preview** et **production** (substitution au moment du build → valeur embarquée dans le bundle).

**Dev local (Metro)** : copier le DSN dans `frontend/.env` (fichier non versionné) ; pour envoyer depuis `__DEV__`, ajouter `EXPO_PUBLIC_SENTRY_DEBUG=1`.

Optionnel (meilleures stack traces natives + source maps) : assistant Sentry  
`npx @sentry/wizard@latest -i reactNative` depuis `frontend/`, ou ajouter le plugin Expo documenté par [Using Sentry — Expo](https://docs.expo.dev/guides/using-sentry/) — aujourd’hui l’init JS suffit pour la plupart des erreurs `AppRootErrorBoundary` / JS.

Référence officielle : [Using Sentry — Expo](https://docs.expo.dev/guides/using-sentry/).
