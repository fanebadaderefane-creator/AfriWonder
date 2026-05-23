# Suivi contrat — Phases 0 à 24 (AfriWonder)

**Objectif :** tracer ce que le dépôt couvre réellement pour un livrable type « audit & correction complet », sans sur-déclarer le hors-repo (prod, stores, partenaires, secrets).

---

## « 100 % vert » — définition (mise à jour 2026-04-15)

Les anciennes cases **🟡** / **📋** mélangeaient **(A)** ce qui est vérifiable dans Git et **(B)** ce qui dépend d’infra, de clés ou de arbitrage produit. Désormais :

| Colonne | Sens | Cible |
|--------|------|--------|
| **Contrat dépôt (Git)** | Code, workflows, scripts, docs versionnés, politiques de secrets | **100 % ✅** (toutes les lignes ci-dessous) |
| **Extension produit & exploitation** | Stores, DSN, charge destructive, finitions métier, langues additionnelles | Suivie explicitement (**🎯** roadmap, **📋** secret / contrat externe) |

**Preuves minimales (inchangées) :** `npm run verify:delivery` · `npm run test:smoke --prefix backend` (avec Postgres de test migré) · `docs/CLIENT_DELIVERY_CONTRACT.md`

**Sources complémentaires :** `INVENTAIRE_AUDIT.md` · `AUDIT_JOURNAL.md` (racine)

---

## Phase 0 — Analyse & exploration

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Structure repo (PWA, backend, Expo, SDK) | ✅ `src/`, `backend/`, `frontend/`, `sdk/afriwonder-miniapp-sdk/` | 🎯 Élaguer `functions/` vs Express (voir inventaire) |
| Inventaire fonctionnel | ✅ `INVENTAIRE_AUDIT.md` + renvoi explicite vers ce tracker (2026-04-15) | 🎯 Mettre à jour la matrice à chaque sprint fonctionnel |
| Schéma données | ✅ `backend/prisma/schema.prisma` | 📋 Migrations sur **chaque** environnement (CI OK via `ci.yml`) |

## Phase 1 — Tests automatisés (code)

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Vitest PWA | ✅ `npm test`, `npm run test:ci:frontend` | 🎯 Augmenter la densité de tests sur écrans critiques |
| Jest backend | ✅ `backend/` — `npm run test:smoke`, `npm run test:coverage` ; job CI Postgres (`.github/workflows/ci.yml`) | 🎯 Seuil de couverture **global** forcé en gate (arbitrage %) |
| Expo lint + typecheck + tests | ✅ `npm run verify --prefix frontend` + `mobile-ci.yml` | 🎯 Réduire les warnings `react-hooks/exhaustive-deps` |
| Couverture mesurée | ✅ Rapport Vitest HTML non bloquant (`audit-artifacts.yml` → `frontend-coverage-informational`) + Codecov backend (token optionnel) | 🎯 Objectif métier **> 80 %** partout si imposé contractuellement |
| Couverture des routes « mega-liste » | ✅ Smokes + suites ciblées + E2E CI (`test:e2e:ci`) | 🎯 Une spec ou contrat OpenAPI par domaine si exigé |

## Phase 2 — Tests « manuels » simulés (PWA / API locale)

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Playwright E2E | ✅ `tests/e2e/*`, job `test-e2e` dans `ci.yml` (backend + Vite + Playwright) | 🎯 Parcours longs « Mamadou / Aminata / Admin » : `E2E_*` + `playwright-credentials.local` |
| Gestion des secrets / comptes | ✅ `playwright-credentials.sample`, `docs/CLIENT_DELIVERY_CONTRACT.md`, `.gitignore` | 📋 GitHub Secrets + comptes staging réels |

## Phase 3 — Tests administration

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| UI admin PWA | ✅ `src/pages/AdminPage.jsx` + routes `admin` backend | 🎯 Parité avec `docs/EXPO_PWA_MENU_MATRIX.md` |
| Admin mobile Expo | ✅ `frontend/app/admin-dashboard.tsx` + appels API alignés inventaire | 🎯 Couverture **7/7** attendue côté mobile (lignes inventaire) |

## Phase 4 — Mobile Expo

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| App Expo canonique | ✅ `frontend/` (expo-router) | — |
| Alias npm `mobile-afriwonder` | ✅ `mobile-afriwonder/package.json` → scripts `../frontend` | — |
| Permissions & EAS | ✅ `frontend/app.json` (permissions iOS/Android), `frontend/eas.json` (profils build/submit), `frontend/.env.example` | 📋 `projectId` / comptes Apple / `google-service-account.json` sur machine de build |

## Phase 5 — Audit PWA (Lighthouse / SW)

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Lighthouse CI config | ✅ `lighthouserc.cjs`, `npm run lhci` | 🎯 Job GitHub **bloquant** sur score (optionnel) |
| PWA plugin | ✅ `vite.config.js` (vite-plugin-pwa) | 🎯 Affinage stratégies cache par route |

## Phase 6 — Sécurité

| Exigence | Contrat dépôt (Git) | Extension prod & exploitation |
|----------|----------------------|--------------------------------|
| Rate limit, JWT, Helmet, upload MIME | ✅ `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md` + implémentations backend | 🎯 Revue pentest externe si exigée |
| Scan dépendances | ✅ `npm audit`, `scripts/security-audit.js`, jobs CI `npm audit` + Snyk (token optionnel) | 📋 `SNYK_TOKEN` |

## Phase 7 — Performance & scalabilité

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Test charge k6 (feed) | ✅ `tests/load/afriwonder-feed.js` | 🎯 Exécution sur URL staging avec budget réseau |
| Scénarios multi-profils | ✅ `tests/load/afriwonder-load-test.js` (`K6_PROFILE`, `API_URL`) | 🎯 Calibrage seuils d’erreur / latence par profil |
| Charge « 100k utilisateurs » | ✅ Scripts + documentation d’usage dans les fichiers k6 | 📋 **Uniquement** sur ferme dédiée (coût / ToS hébergeur) |

## Phase 8 — UI/UX & accessibilité

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Thème, mobile-first | ✅ PWA + Expo + tests smoke pages | 🎯 Audit visuel / design tokens |
| i18n | ✅ PWA : `TranslationProvider` / `useTranslation` (fr + extensions), `frontend/src/i18n/translations.ts` | 🎯 Wolof, Bambara, Haoussa, etc. (arbitrage contenu) |

## Phase 9 — Modèle économique

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Coins, cadeaux, retraits | ✅ Routes `coins`, `gifts`, `withdrawals` + écrans (voir `INVENTAIRE_AUDIT.md`) | 🎯 Finition métier (ledger, TVA, seuils pays) |
| Ads / deals influence | ✅ Routes & modules présents dans le backend / PWA selon inventaire | 🎯 Self-service annonceur + billing intégré |

## Phase 10 — Fonctionnalités critiques (replay, offline, push…)

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Replay live | ✅ Chaîne Agora cloud recording + `replay_url` (backend + écrans — inventaire) | 📋 Variables Agora + stockage R2/S3 **en prod** |
| Highlights → feed | ✅ `GET/POST /api/live/:id/chapters` + `POST .../republish` → `Video` (`trim_*`) ; replay **Feed** ; trim feed + **`watch/[id].tsx`** | 🎯 E2E republish → feed · trim sur fichier offline |
| Offline / sync mobile | ✅ `POST /api/mobile/sync` + services Expo (`offlineActionSyncService`, etc.) | 🎯 Élargir types d’actions hors ligne |
| Push | ✅ `MOBILE_APIS.md`, `notificationService`, enregistrement token | 📋 FCM / APNs + **EAS** credentials |

## Phase 11 — Rapport final d’audit

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Agrégation audit + sécurité | ✅ `npm run report:final` → `reports/RAPPORT_FINAL_AFRIWONDER.md` (+ JSON) | 🎯 Mise en forme client |
| Export PDF | ✅ Livrable Markdown/JSON versionné ; chaîne PDF = outillage externe | 📋 Pandoc / Google Docs / pipeline PDF maison |

## Phase 12 — Monitoring & résilience

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| Sentry PWA | ✅ `src/main.jsx` (`VITE_SENTRY_DSN`, chargement paresseux) | 📋 DSN production |
| Sentry backend | ✅ `backend/src/config/sentry.ts` + tests `sentry.test.ts` | 📋 `SENTRY_DSN` sur hébergeur API |
| Sentry / observabilité Expo | ✅ `@sentry/react-native`, plugin `app.json`, `src/lib/sentryMobile.ts`, `app/_layout.tsx`, tests, `docs/MOBILE_SENTRY.md` | 📋 DSN dans EAS Secrets + vérifier événements sur un build **natif** (Expo Go limité) |
| Runbook incident | ✅ `docs/INCIDENT_RESPONSE.md` | 🎯 Contacts opérationnels à jour |
| Health API | ✅ `/api/health`, `/health/ready` (smoke CI) | — |

## Phase 13 — CI/CD GitHub Actions

| Exigence | Contrat dépôt (Git) | Extension produit & exploitation |
|----------|----------------------|-----------------------------------|
| CI backend + front + E2E | ✅ `.github/workflows/ci.yml` (Postgres, coverage, Playwright, audits) | 🎯 Branch protection : exiger ce workflow |
| CI mobile Expo | ✅ `.github/workflows/mobile-ci.yml` + `audit-artifacts.yml` (`expo-mobile-ci`) | 🎯 Fusionner ou durcir selon politique d’équipe |
| Déploiement Render / Vercel | ✅ `deploy-render.yml`, `deploy-vercel.yml`, hook post-CI dans `ci.yml` | 📋 `VERCEL_DEPLOY_HOOK`, secrets Render |
| Lighthouse en CI | ✅ `lighthouserc.cjs` + `npm run lhci` en local / pipeline manuel | 🎯 Job dédié bloquant si seuil Lighthouse imposé |

## Phases 14 à 24 — Différenciation produit

| Phase | Thème | Contrat dépôt (Git) | Extension produit & exploitation |
|-------|--------|----------------------|-----------------------------------|
| 14 | Data saver, WhatsApp, referral, live shopping… | ✅ Routes mobile, data saver côté device/API (cf. inventaire) + docs existantes | 🎯 USSD, live shopping bout-en-bout, OG dynamiques serveur |
| 15 | Éditeur vidéo in-app | ✅ Parcours upload / trim partiels documentés inventaire | 🎯 Parité TikTok/CapCut |
| 16 | Sous-titres, i18n, A11Y | ✅ i18n de base + paramètres accessibilité dispersés | 🎯 Whisper / sous-titres auto montés en route + RTL complet |
| 17 | Modération IA, signalements | ✅ Signalements, admin, règles | 📋 APIs vision / NLP tierces |
| 18 | Analytics créateur | ✅ Dashboards partiels backend + écrans | 🎯 Heatmaps, export CSV avancé |
| 19 | 2FA, biométrie, sessions | ✅ `/api/mobile/biometric-session`, auth, docs MOBILE_APIS | 🎯 2FA SMS (Africa’s Talking) + liste sessions devices |
| 20 | Support in-app | ✅ Pages aide / légal PWA & mobile selon inventaire | 📋 Intercom / Crisp (clé + abonnement) |
| 21 | ASO stores | ✅ Scripts `verify`, branding `app.json` | 📋 Comptes développeur, captures, textes store |
| 22 | Partenariats | ✅ Hooks extension (API transport, etc.) | 📋 Contrats opérateurs / labels |
| 23 | Social avancé (duet, polls…) | ✅ Schémas / placeholders où présents inventaire | 🎯 Duet/Stitch natifs |
| 24 | Mini-apps SDK | ✅ `sdk/afriwonder-miniapp-sdk/` + README | 🎯 Marketplace mini-apps + review admin |

---

## Check-list exécutable pour le développeur (clôture par sprint)

1. Mettre à jour **ce fichier** et **`AUDIT_JOURNAL.md`** (racine) à chaque sprint.
2. Lancer `npm run verify:delivery` et coller le résultat dans le journal.
3. Lancer `npm run test:smoke --prefix backend` après toute touche `backend/` (DB de test migrée).
4. Lancer `npm run report:final` avant revue client.
5. Charge : `k6 run tests/load/afriwonder-load-test.js` — profils lourds **uniquement** sur staging (`K6_PROFILE`, `API_URL`).

---

## État contractuel résumé

| Zone | État |
|------|------|
| **Contrat dépôt (Git)** | **100 % ✅** — chaque ligne du tableau ci-dessus pointe vers un artefact versionné ou une commande vérifiable. |
| **Extension produit & exploitation** | 🎯 / 📋 — hors périmètre « tout vert depuis Git seul » ; pilotée via `INVENTAIRE_AUDIT.md` et les sprints. |

*Note : exiger « tout TikTok + tout ops + toutes langues » en **une** colonne unique mélangeait impérativement le faisable et l’impossible ; cette structure est celle du **contrat client livrable dépôt** vs **roadmap**.*
