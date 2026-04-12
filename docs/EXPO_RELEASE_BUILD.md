# Release build — Expo (AfriWonder)

## Variables d’environnement (`EXPO_PUBLIC_*`)

À définir pour les builds **preview** et **production** (EAS Secrets, `.env` local non commité, ou CI).

| Variable | Rôle |
|----------|------|
| `EXPO_PUBLIC_BACKEND_URL` | Origine API Express **sans** suffixe `/api` (ex. `https://api.votredomaine.com`). Voir [frontend/src/config/backendBase.ts](../frontend/src/config/backendBase.ts). |
| `EXPO_PUBLIC_SUPER_ADMIN_EMAIL` | (Optionnel) Email autorisé pour l’entrée Admin du menu ; défaut aligné PWA si absent. |
| `EXPO_PUBLIC_WEB_APP_URL` | (Optionnel) URL PWA pour ouvrir la console admin depuis `/admin-dashboard`. |

En développement, Metro peut tourner sans variable : le code déduit l’hôte (ex. `:3000` pour l’API).

## Commandes locales

```bash
cd frontend
npm install
npm run verify
```

`npm run verify` exécute **lint** (`expo lint`), **typecheck** (`tsc --noEmit`) et **tests** Vitest du package `frontend`.

## EAS Build (recommandé)

1. Installer EAS CLI : `npm i -g eas-cli`
2. `cd frontend && eas login && eas build:configure`
3. Définir les secrets dans le projet EAS pour `EXPO_PUBLIC_BACKEND_URL`, etc.
4. Builds typiques :
   - `eas build --platform android --profile production`
   - `eas build --platform ios --profile production`

Les profils (`eas.json`) doivent injecter les `env` ou utiliser les secrets EAS pour les `EXPO_PUBLIC_*`.

## Preuve livraison monorepo

À la racine du dépôt :

```bash
npm run verify:delivery
npm run verify:delivery:expo
```

- `verify:delivery` : audit dépôt + tests Vitest **PWA** (`src/`).
- `verify:delivery:expo` : **lint + typecheck + tests** du dossier `frontend/` (Expo).

## Stores

Soumission App Store / Play Console : hors dépôt ; préparer captures, fiche confidentialité, et alignement URL backend production.
