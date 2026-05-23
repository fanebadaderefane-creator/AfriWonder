# 10 instructions pour le développeur — AfriWonder

Document de passation (aligné **audit Page 19**, mis à jour pour le dépôt **2026**).  
**Correction importante par rapport à une ancienne version du rapport :** le backend cible est **Render** (fichiers `render.yaml`, `Dockerfile.backend`, `.github/workflows/deploy-render.yml`), **pas Railway**.

**État déjà réalisé dans ce repo (ne pas refaire aveuglément) :** voir `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md`, `docs/ARCHITECTURE.md`, dossier `docs/` à la racine propre, `flutter_app/`, backend unique `backend/`, `entities/` (pas `entités/`), `.env.example` racine + `backend/.env.example`, workflows `detect-secrets`, CodeQL, Dependabot.

---

## 1 — Sécurité d’abord

| # | Instruction | Notes / état repo |
|---|-------------|---------------------|
| 1 | Cloner le repo et créer une branche `cleanup/repo-restructure` | Branche possible pour travaux isolés ; `main` contient déjà une grande partie du nettoyage. |
| 2 | Installer **detect-secrets** : `pip install detect-secrets` | CI : `.github/workflows/detect-secrets.yml` + `.secrets.baseline`. Réinstaller localement si besoin. |
| 3 | Scanner : `detect-secrets scan > .secrets.baseline` | À relancer après gros changements ; tri manuel si l’historique Git contient de faux positifs ou de vrais secrets (rotation si doute). |
| 4 | Créer un compte **Doppler** et y importer les variables (équivalent `.env`) | Fichier `doppler.yaml` à la racine — créer les configs **dev / staging / prod** côté Doppler. |
| 5 | Activer **GitHub Secret Scanning** (et idéalement Push protection) | Manuel : *Settings → Code security* du dépôt ou de l’org. Voir `SECURITY.md`. |
| 6 | **Révoquer et régénérer** tokens OAuth, JWT, clés API si l’historique ou des fuites le justifient | Opérationnel ; pas automatisé dans le dépôt. |
| 7 | Commiter les **`.env.example`** (sans secrets) | **Fait** : `.env.example`, `backend/.env.example` ; compléter si de nouveaux services. |

---

## 1 — Nettoyage structural

| # | Instruction | Notes / état repo |
|---|-------------|---------------------|
| 1 | Créer `docs/` et y déplacer les `.md` hors README/CHANGELOG | **Fait** (gouvernance racine : voir `README.md`). |
| 2 | Supprimer `mobile/`, `mobile-afriwonder/`, `android/`, `ios/` (garder l’app Flutter) | **Fait** (stratégie PWA + Flutter). |
| 3 | Supprimer `backend-go/` ou branche expérimentale | Backend Go retiré ; API unique `backend/` (Node). |
| 4 | Supprimer `entités/`, garder `entities/` | **Fait**. |
| 5 | Renommer `mobile_flutter/` → `flutter_app/` | **Fait** — travailler dans `flutter_app/`. |
| 6 | Créer `docs/ARCHITECTURE.md` avec diagramme | **Fait** (Mermaid dans `docs/ARCHITECTURE.md`). |
| 7 | Créer les 3 environnements Doppler : dev, staging, prod | **À faire** côté compte Doppler (fichier `doppler.yaml` présent). |
| 8 | Déployer le backend Node.js sur **Render** (~30 min une fois le compte prêt) | **Pas Railway.** Voir `render.yaml`, `docs/DEPLOYMENT.md`, `docs/ETAPES_DEPLOIEMENT.md`, secrets `RENDER_DEPLOY_HOOK_*` pour CI. Variable **`DATABASE_URL`** identique en local et sur Render. |

---

## 2–3 — Infrastructure (partiellement no-code)

| # | Instruction | Notes |
|---|-------------|--------|
| 1 | Migrer la DB vers **Supabase** (export/import, tester `prisma migrate`) | En cours / partiel : `DATABASE_URL` peut pointer vers Postgres Supabase ; routes Supabase auth/storage côté API. Valider migrations sur une copie avant prod. |
| 2 | Supabase Storage **ou** Cloudflare R2 pour vidéos | R2 + multipart déjà côté backend ; choix produit : un seul stockage principal ou hybride. |
| 3 | **Sentry** frontend + backend | Dépendances et config possibles — vérifier `SENTRY_DSN` / `VITE_SENTRY_DSN` dans les `.env.example`. |
| 4 | **PostHog** (tracking) | À intégrer si la roadmap produit le valide (pas obligatoire dans le dépôt actuel). |
| 5 | **Resend** (emails transactionnels) | À brancher ou compléter vs SMTP/Sendgrid déjà mentionnés dans `backend/.env.example`. |
| 6 | Projet **Figma** design system | Checklist : `docs/DESIGN_SYSTEM_FIGMA_CHECKLIST.md`. |
| 7 | **README** unifié, supprimer doublons | `README.md` racine = point d’entrée ; doublons historiques retirés vers `docs/`. |

---

## 2–3 — Application Flutter (`flutter_app/`)

| # | Instruction | Notes |
|---|-------------|--------|
| 1 | Projet Flutter **feature-based** | Structurer progressivement ; le dossier `flutter_app/` existe. |
| 2 | **Riverpod** 2.x | À aligner sur `pubspec.yaml` / pratique d’équipe. |
| 3 | **go_router** | Navigation déclarative. |
| 4 | **Dio** (+ Retrofit si génération) vers l’API existante | Base URL = même contrat que PWA (`VITE_API_URL` / proxy). |
| 5 | Feed vidéo vertical (core) | Parité fonctionnelle avec la PWA sur le long terme. |
| 6 | **Firebase** push | Config plateforme + variables backend FCM si besoin. |
| 7 | **Fastlane** (builds App Store / Play) | À ajouter dans le pipeline mobile. |
| 8 | Tests sur **Android Go** (≥ 1 Go RAM) | QA matériel. |

---

## Critères de succès — avant lancement (rappel audit)

| Critère | Comment le prouver |
|---------|---------------------|
| Lighthouse Performance **> 90** mobile | `lighthouserc.cjs` + mesure sur URL prod réelle (réseau + cache). |
| API **< 200 ms** routes critiques | APM / logs (Sentry, Render metrics, ou outil dédié) sur chemins définis (ex. `/health`, auth, feed). |
| **0 secrets** dans l’historique Git | `detect-secrets`, GitHub Secret Scanning, rotation si fuite avérée. |
| Tests : front **> 70 %**, backend **> 80 %** | Couverture CI (`vitest`, `jest`/backend selon config). |
| Flutter **iOS 14+** et **Android 9+** | Matrices de test / stores. |
| **Mode offline** testé | App Flutter (Hive) + comportement PWA. |
| **Orange Money + Wave** en sandbox | Credentials marchands + flux documentés. |
| **Revue de sécurité** avant prod | Checklist interne + pentest léger si budget. |

---

## Références rapides

| Sujet | Fichier / endpoint |
|--------|---------------------|
| Statut audit honnête | `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md` |
| Déploiement Vercel + Render | `docs/DEPLOYMENT.md` |
| Variables d’environnement | `docs/ENV_REFERENCE.md`, `.env.example` |
| Roadmap API (exigences, pas bilan) | `GET /api/platform/config` → `audit_roadmap`, `audit_roadmap_meta` |
