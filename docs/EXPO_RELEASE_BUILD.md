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

**Organisation** : `videovocalafriwonder` — **Projet** : `@videovocalafriwonder/afriwonder-production`  
**Project ID** : dans `app.json` → `extra.eas.projectId` (créé par `eas init`)

1. Installer EAS CLI : `npm i -g eas-cli`
2. `cd frontend && eas login` (accès org **videovocalafriwonder**)
3. Lier le projet : `eas init --non-interactive --force` puis `npm run sync:eas-project-env`
4. Vérifier : `npm run verify:eas-org`
5. Définir les secrets dans le projet EAS pour `EXPO_PUBLIC_BACKEND_URL`, etc.
6. Builds typiques :
   - `npm run eas:android:callDiagnostic` — APK tests appels
   - `npm run eas:android:production` — AAB Play Store

## Signature Android (Google Play)

**Certificat prod obligatoire pour tous les AAB** — FANE ABDOULAYE / FBF-GLOBAL, RSA 4096, SHA384withRSA :

| | Empreinte |
|---|-----------|
| **SHA-1** | `85:A5:AF:29:52:74:2F:0E:AE:D9:22:77:16:FB:29:CB:4A:AF:A8:CF` |
| **SHA-256** | `D5:E0:38:36:22:57:3F:9F:A6:A0:5B:30:2F:2E:29:B6:28:B0:F0:BF:77:92:33:D4:1E:0B:BF:85:E8:1B:09:16` |

→ Firebase, Google Cloud OAuth Android, signature AAB Play Console.

**Interdit** (clé EAS auto-générée) : SHA-1 `E9:26:B0:F2:…`

Avant `eas:android:production` :

```bash
cd frontend
node scripts/install-android-prod-keystore.cjs --jks "CHEMIN/vers/prod.jks" --alias ALIAS --storepass MDP
npm run verify:android-signing   # doit afficher OK FBF-GLOBAL 85:A5:AF…
```

Politique : `frontend/scripts/androidSigningPolicy.cjs`

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
