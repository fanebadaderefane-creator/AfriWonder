# Audit Alignment Status — 2026-04-01

This file tracks concrete repository alignment against the client audit.

## Charte d’honnêteté (ne pas sur-déclarer)

- **Backend** : la cible documentée dans ce dépôt est **Render** uniquement (fichiers `render.yaml`, `Dockerfile.backend`, workflows `deploy-render*.yml`). Il n’y a pas de configuration Railway active.
- **Base de données** : une seule variable **`DATABASE_URL`** pour Prisma (local `backend/.env` et **Render → Environment** avec le **même nom**). Ce n’est pas un alias différent par hébergeur.
- **Distinction** :
  - *Présent dans le code* ≠ *validé en production*.
  - *Roadmap dans l’API* (`GET /api/platform/config` → `audit_roadmap`) = **liste d’exigences** du rapport ; le champ `audit_roadmap_meta.disclaimer_fr` le rappelle. Ce n’est **pas** un certificat que tout est terminé.
- Les tableaux ci-dessous utilisent une **légende** : ✅ code/config dépôt · 🟡 partiel ou prod non prouvé · 📋 hors repo (ops, design, juridique) · ❌ non livré côté code.

## Clôture — « terminé » ou pas (réponse directe)

| Périmètre | Statut |
|-----------|--------|
| **Travail dépôt (code + docs + CI)** | **Terminé** pour ce qui était demandé comme *alignement repository* : Render, `DATABASE_URL`, workflows, roadmap exposée (`/api/platform/config`), **`audit_repo_completion`**, script **`npm run verify:audit`**, workflow dédié **`.github/workflows/audit-artifacts.yml`** (verify dépôt + Flutter ; rapport couverture Vitest non bloquant), CI principale **`ci.yml`** sans bloquer E2E sur Flutter, `.env.example` (racine, backend, Flutter, SDK), sécurité/rate limit côté code, références audit. |
| **Audit business / rapport « 100 % exécuté »** | **Non terminé** : Figma livré, déploiement prod validé, charge 1000 req/s **mesurée** sur Render, bêta 500, stores, marketing 3 pays, levée Seed, etc. sont des **actions hors dépôt** ou à valider en prod. |

**En une phrase :** le dépôt est **clos pour la traçabilité technique** de la roadmap ; l’**exécution complète** du plan d’audit reste du **pilotage produit / infra / finance**.

## Done today (real changes applied)

- **Dossier Flutter dupliqué** : suppression de `mobile_flutter_riverpod/` (un seul projet mobile canonique : `flutter_app/`).
- **Rate limiting aligné audit (page 11)** : limite générale `/api/*` = **`API_GENERAL_RATE_LIMIT_MAX`** (défaut **100 req/min**), clé **`user:<id>`** si JWT valide (vérif sans DB), sinon **`ip:`** ; webhooks inchangés ; dev / E2E Playwright inchangés (pas de plafond en dev, contournement prod limité comme pour `authLimiter`). Voir `backend/src/middleware/rateLimiting.ts` et `ENV_TEMPLATE.txt`.
- **Vérification automatisée dépôt vs audits** : `scripts/verify-audit-repo.mjs` + **`npm run verify:audit`** ; workflow **`.github/workflows/audit-artifacts.yml`** — verify dépôt, Flutter (`pub get`, `analyze`, `test`), job **`frontend-coverage-informational`** (Vitest + artefact HTML, `continue-on-error`). La **CI principale** (`.github/workflows/ci.yml`) ne bloque plus E2E / déploiement sur ces jobs.
- **Statut d’achèvement (honnête)** : `backend/src/config/auditCompletion.ts` exposé dans **`GET /api/platform/config`** sous **`data.audit_repo_completion`** (ne remplace pas la roadmap ; indique ce qui est *dans le repo* vs *manuel / externe*).
- **Exemples d’environnement** : `flutter_app/.env.example`, `sdk/afriwonder-miniapp-sdk/.env.example` (en plus racine + backend).
- **`docs/ENV_REFERENCE.md`** : Flutter/SDK, Resend, PostHog, JWT 64+, lien `npm run verify:audit` ; **`README.md`** (section Tests) : commande `verify:audit`.
- **Roadmap audit pages 16–17 (texte officiel)** centralisée dans `backend/src/config/auditRoadmap.ts` et exposée via **`GET /api/platform/config`** (`data.audit_roadmap`).
- **Suivi structuré** : section « Roadmap audit — suivi Phases 1 à 4 » dans ce fichier (tableaux code vs ops).
- **Design system Figma** : checklist exécutable `docs/DESIGN_SYSTEM_FIGMA_CHECKLIST.md`.
- **Doppler** : `doppler.yaml` complété (configs `stg` / `prd` à créer côté dashboard).
- **Sécurité GitHub** : `SECURITY.md` précise Secret scanning + Push protection + CodeQL.
- **README** : liens vers statut d’audit, vision, checklist Figma.

- Root markdown cleanup performed:
  - All root `*.md` files except `README.md` and `CHANGELOG.md` were moved to `docs/`.
  - Root now keeps only: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- Added root governance entry points:
  - `CONTRIBUTING.md` -> points to `docs/CONTRIBUTING.md`
  - `SECURITY.md` -> points to `docs/SECURITY.md`
- `.env.example` requirements satisfied:
  - Root `.env.example` exists.
  - `backend/.env.example` exists.
  - `README.md` updated to stop suggesting manual creation when examples are present.
- Duplicate entities naming normalized:
  - `entités/` removed.
  - JSON entity files moved to `entities/`.
- Deployment source-of-truth:
  - Canonical `docs/DEPLOYMENT.md` present in `docs/`.
  - Removed duplicate deployment docs (`docs/DEPLOIEMENT*.md`).
- Ordered execution started from audit "Jour 1":
  - Branch `cleanup/repo-restructure` created.
  - `detect-secrets` installed locally.
- Flutter folder naming aligned with audit:
  - `mobile_flutter/` renamed to `flutter_app/`.
  - Internal references updated in docs.
- Legacy strategy folders removed from root:
  - `mobile-afriwonder/` removed.
  - `android/` removed.
  - `ios/` removed.
- Backend strategy consolidated:
  - `experimental-backend-go/` removed from working tree (single active backend remains `backend/`).
- Legacy RN-specific automation/config removed:
  - Deleted `scripts/release-android-bundle.cjs`.
  - Removed Capacitor release/open scripts from root `package.json`.
  - Removed obsolete RN-focused Cursor rule (`.cursor/rules/pwa-rewritten-in-react-native.mdc`).
- Legacy RN gap report removed:
  - Deleted `docs/PWA_VS_RN_GAP_REPORT.md` to avoid conflicting mobile strategy docs.
- CI/CD hardening added:
  - Added `.github/workflows/release.yml` to publish GitHub Releases on SemVer tags (`v*.*.*`).
  - Added `.github/workflows/detect-secrets.yml` to enforce `.secrets.baseline` checks on push/PR.
- Legacy references cleanup in docs:
  - Updated remaining references to React Native/Capacitor/Golang target stack in key documents to align with `PWA + Flutter + Node.js`.
- External security runbook added:
  - Added `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md` to execute key rotation and GitHub Secret Scanning closure with proof.
- Page 11 security hardening applied in backend:
  - JWT defaults aligned to audit: access token `15m`, refresh token `30d`.
  - Enforced minimum secret strength in auth service: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be 64+ chars.
  - Added refresh token revocation blacklist service with Redis support (`backend/src/services/refreshTokenBlacklist.service.ts`).
  - Added `/api/auth/logout` route that revokes refresh token and clears httpOnly cookies.
  - Strengthened auth rate limit to `5 req/min` on auth critical routes.
  - Strengthened security headers in `backend/src/app.ts` (HSTS in prod, CSP, X-Frame-Options deny via Helmet).
  - Added upload MIME sanitization filters for media/documents in `backend/src/routes/upload.routes.ts`.
- Page 12 privacy baseline already present and confirmed:
  - Public privacy page route exists (`/PrivacyPolicy`).
  - RGPD account deletion workflow exists (`/api/privacy/delete-account` + status/cancel endpoints).
- Page 13–14 UI/UX standards alignment (blue theme preserved by explicit user request):
  - Lighthouse CI thresholds raised toward audit targets in `lighthouserc.cjs`:
    - Performance `>= 90`, Accessibility `>= 95`, SEO `>= 95` (warning gate),
    - LCP `<= 2.5s`, CLS `<= 0.1`, server response time `<= 800ms`.
  - Theme color kept blue in PWA manifest (`vite.config.js`): `theme_color` set to `#2563eb`.
  - Error shell fallback UI in `src/main.jsx` aligned with blue palette (removed orange hardcoded accents).
  - Existing coverage confirmed for key audit UX items: dark mode support, offline/PWA service worker, guest browsing path (`/Discover`), and SEO metadata + JSON-LD in `index.html`.
  - Data saver UX updated in `src/components/common/DataModeToggle.jsx`:
    - blue UI palette (no orange),
    - visible estimated data usage per mode (Auto/Lite/HD) before media-heavy usage.
  - Design token alignment refined in `src/index.css`:
    - base radius moved to `12px` (`--radius: 0.75rem`),
    - interaction transition timing aligned to `200ms ease-out`.
  - Language baseline expanded in `src/components/common/TranslationProvider.jsx` with additional locale keys:
    - `wo` (Wolof), `ha` (Hausa), `sw` (Swahili) as first-level supported locales.
- Page 15 Business Plan & Modèle économique aligned in docs:
  - Updated `docs/VISION_ET_ARCHITECTURE_CIBLE.md` section marché with audit metrics/sources
    (UN Data, GSMA, DataReportal, Statista, McKinsey Africa, FSD Africa).
  - Updated revenue model table for MVP Phase 1 with mechanisms, year-1 ranges and priority.
  - Added conservative financial projections table (Beta, Lancement, Croissance, An 2 Scale)
    with users, GMV, revenue and opex/month.
- Page 17 roadmap aligned in docs:
  - Added section `Roadmap de développement` in `docs/VISION_ET_ARCHITECTURE_CIBLE.md`
    with 4 phases (Fondation, MVP Vidéo+Marketplace, Flutter+Lancement, Croissance)
    and the milestones listed in the audit.
  - Added backend deployment workflow for Render: `.github/workflows/deploy-render.yml`
    (trigger via push on `backend/**` or manual dispatch, using `RENDER_DEPLOY_HOOK_BACKEND` secret).
  - Added Render staging workflow: `.github/workflows/deploy-render-staging.yml`
    (trigger via push on `develop` or manual dispatch, using `RENDER_DEPLOY_HOOK_BACKEND_STAGING` secret).

## Validation Zod (écart vs audit « toutes les routes POST/PUT »)

- **Vague 1** : `backend/src/schemas/highRiskBodies.ts` — **`privacy`**, **`messages`**, **`live`** (détail inchangé).
- **Vague 2** : `backend/src/schemas/videosCommentsAdmin.schemas.ts` — **`videos.routes.ts`** (création / mise à jour, vue, trim, réactions, like, commentaire, patch commentaire sous `/videos`, tips, chapitres VOD, sous-titres), **`comments.routes.ts`** (PUT), **`admin.routes.ts`** (rôle, ban, vendeurs, vérifs KYC, produits, logistique tarifs & points relais, backup trigger, kill-switch, crowdfunding suspend, suspend user, blacklist, feature flags, commissions, rejet monétisation, mots interdits, expériences A/B).
- **Vague 3 (ordre cart → products → notifications)** : `backend/src/schemas/cartProductsNotifications.schemas.ts` — **`cart.routes.ts`** (add, update, coupon), **`products.routes.ts`** (CRUD produit, stock, Q/R, group buy, enchères, alertes, offres, précommande, promotion, flash sale, questions), **`notifications.routes.ts`** (préférences, push subscribe/unsubscribe).
- **Vague 4 (ordre addresses → ads → airtime)** : `backend/src/schemas/addressesAdsAirtime.schemas.ts` — **`addresses.routes.ts`** (POST, PUT), **`ads.routes.ts`** (impression, report, click, création / mise à jour campagne, créatif, reject admin), **`airtime.routes.ts`** (recharge).
- **Vague 5 (couverture monorepo JSON)** : `backend/src/schemas/jsonObjectBody.ts` (`jsonObjectBodySchema`) + script `scripts/apply-json-object-zod-routes.mjs` — `validateBody` sur les routes **POST/PUT/PATCH** dont le corps est du JSON Express, avec exclusions documentées : **`upload.routes.ts`** / **`cloud.routes.ts`** (multer), routes dont le path contient **`webhook`** côté paiements (corps **Buffer** / `express.raw`), **`POST /api/privacy/cancel-deletion/:token`** (token en path uniquement). Les routes sans schéma métier utilisent le **fallback** `z.record(z.string(), z.unknown())` (objet racine obligatoire, pas de validation fine des champs).
- **Honnêteté** : la cible « schéma Zod strict par endpoint » du PDF n’est pas partout remplacée par des schémas métier — une grande partie du monorepo repose sur le **fallback** ci-dessus jusqu’à affinage route par route.

## « Terminer tout » — périmètre réel

| Zone | Statut |
|------|--------|
| **Code dépôt (CI, Zod prioritaire, rate limit, Flutter canonique, docs)** | Poussé au maximum dans cette série de commits ; `npm run verify:audit` inclut la présence des fichiers de schémas. |
| **GitHub** : Secret Scanning + Push Protection, triage historique secrets, rotation clés | **Manuel** (paramètres org/repo + procédure `docs/SECURITY_SECRET_ROTATION_RUNBOOK.md`). |
| **Doppler** : projets `dev` / `stg` / `prd` liés au repo | **Manuel** (dashboard Doppler). |
| **Prod** : Lighthouse réel, SLA API mesuré, charge 1000 req/s sur Render, OM/Wave sandbox bout-en-bout | **Manuel / infra** (URLs, credentials marchands, sondes). |
| **Couverture tests 70 % / 80 %** | **CI + effort test** (non garanti par ce seul lot). |
| **Flutter** : Retrofit codegen, QA Android Go device, builds store | **Partiellement code**, **soumission stores = manuel**. |
| **Figma équipe, bêta 500 users, marketing 3 pays, levée Seed** | **Hors dépôt**. |

**Conclusion :** on peut dire **« terminé pour le périmètre technique prioritaire du dépôt »** ; on ne peut pas dire **« terminé = audit PDF + business 100 % »** sans exécuter la colonne **Manuel** ci-dessus.

**Pour l’exécution concrète (équipe / comptes / prod) :** suivre la checklist ordonnée **`docs/AUDIT_EXECUTION_CHECKLIST.md`** (phases A → G, cases à cocher + liens vers les runbooks existants).

## Partially done / constrained today

- Secret baseline generation:
  - `.secrets.baseline` generated with the exact audit command `detect-secrets scan > .secrets.baseline`.
  - A lightweight git history keyword scan was executed; results include many token/auth references in code, requiring manual triage for real exposed secrets.
- Doppler centralization:
  - Requires external setup (Doppler project/environments and GitHub integration), cannot be completed only from repository code.
- Page 13–14 remaining non-code/ops items:
  - Real Lighthouse/PSI score validation must be run on production URL (network + infra dependent).
  - Android Go device QA, full multilingual rollout (FR/EN/Wolof/Hausa/Swahili), and USSD payment flow require product/ops rollout beyond this code patch set.
- Page 15 remaining non-code items:
  - Real business validation depends on market execution (acquisition, conversion, retention) and financial tracking in production.
- Page 17 remaining non-code/ops items:
  - Supabase migration, Render rollout tuning, 1000 req/s load target, beta users, store submissions,
    and fundraising are execution tracks requiring infra/ops/business actions beyond repository docs.

## Remaining to reach full audit target

- Optional hardening steps from audit:
  - Rotate any exposed keys if found by secret triage.
  - Enable/verify GitHub Secret Scanning + Push Protection at repository settings level.
  - Configure Doppler environments (`development`, `staging`, `production`) and role-based access.

## Roadmap audit (pages 16–17) — suivi factuel

Texte des exigences également dans l’API : **`GET /api/platform/config`** → `data.audit_roadmap` + **`audit_roadmap_meta`** (avertissement, `DATABASE_URL`, hébergement **render**). Fichier : `backend/src/config/auditRoadmap.ts`.

### Phase 1 — Fondation

| Exigence audit | Statut | Notes honnêtes |
|----------------|--------|----------------|
| Nettoyage repository | 🟡 | Refactors et docs faits ; « complet » reste subjectif et évolutif. |
| Supabase (DB + Auth + Storage) | 🟡 | Chemins Supabase/auth/presign présents ; **DB principale** toujours Prisma + **`DATABASE_URL`** Postgres (souvent Supabase comme hôte). Migration « full Supabase only » : non. |
| Déploiement backend **Render** + CI/CD | 🟡 | `render.yaml`, Docker, workflows présents ; **compte Render + hooks secrets** = à valider côté ops. |
| Doppler + GitHub Secret Scanning + rate limiting | 🟡 / ✅ | Rate limit : **✅** code. Doppler : **📋** fichier seulement. Scanning : **🟡** CI `detect-secrets` + doc ; activation GitHub org/repo : **📋**. |
| Design system Figma | 📋 | Checklist + tokens CSS ; **fichier Figma équipe** hors dépôt. |
| `.env.example` | ✅ | Racine + `backend/` + `flutter_app/` + `sdk/afriwonder-miniapp-sdk/` + `docs/ENV_REFERENCE.md`. |
| 1000 req/s | 🟡 | Script `load-test-node.js` + cible configurable ; **pas une certification** sur l’instance Render réelle sans mesure prod. |

### Phase 2 — MVP Vidéo + Marketplace

| Exigence | Statut | Notes honnêtes |
|----------|--------|----------------|
| Feed vertical type TikTok | 🟡 | Implémentation lourde dans le code ; perfectionnement continu (règles `.cursor`). |
| Upload chunked R2 | 🟡 | Service + routes ; dépend **config R2** et tests réels. |
| Live Agora | 🟡 | Routes + docs ; **finalisation** = clés + QA bout-en-bout. |
| Marketplace produits / panier / checkout | 🟡 | Modules présents ; parcours prod à valider (paiements réels). |
| Orange Money + Wave (SN, CI, ML) | 🟡 | Code + régions ; **contrats / credentials** marchands = 📋. |
| PWA `afri-wonder.app` | 🟡 | Config + CORS ; **DNS / domaine** = 📋. |
| Beta 500 utilisateurs | 🟡 | Plafonds via env + API ; **recrutement** = 📋. |

### Phase 3 — Flutter + lancement

| Exigence | Statut | Notes honnêtes |
|----------|--------|----------------|
| Flutter + Riverpod | 🟡 | Dossier `flutter_app/` ; couverture fonctionnelle et **Riverpod partout** : à confirmer. |
| Stores iOS / Android | 📋 | Soumissions hors repo. |
| Push Firebase | 🟡 | Variables backend + PWA VAPID possibles ; **projet Firebase** 📋. |
| Hive offline first | 🟡 | À valider dans l’app Flutter (pas seulement dépendances). |
| Lighthouse > 90 | 🟡 | Seuils CI / doc ; **score prod** dépend réseau et build. |
| Marketing 3 pays + 100 créateurs | 📋 | `PILOT_COUNTRIES` / `CREATOR_PARTNERS_TARGET` = paramètres ; exécution marketing 📋. |

### Phase 4 — Croissance

| Exigence | Statut | Notes honnêtes |
|----------|--------|----------------|
| Gamification complète | 🟡 | Services / routes existants ; « complet » métier à valider produit. |
| Reco IA (TF.js ou API Python) | 🟡 | Routes + proxy possible ; **moteur dédié** souvent 📋. |
| MTN + Stripe Afrique | 🟡 | Chemins code ; **comptes / conformité** 📋. |
| Télémedecine | 🟡 | Flags / commissions / rendez-vous ; priorité produit 📋. |
| B2B SDK | 🟡 | Package `sdk/afriwonder-miniapp-sdk` ; adoption partenaires 📋. |
| Levée Seed 500k–2M | 📋 | Indicateur dans `/platform/config` seulement ; fundraising 📋. |

## Integrity note

Les statuts 🟡 / 📋 signifient : **ne pas présenter l’audit comme « 100 % terminé »** sans preuves prod (mesures, stores, contrats, DNS, levée). Le dépôt reste aligné **Render** + **`DATABASE_URL`** ; il n’y a pas de seconde vérité « autre hébergeur » pour le backend dans ces documents.
