# Journal d’audit AfriWonder

**Exigence cahier des charges :** fichier à la racine, mis à jour en continu.  
**Ne jamais y coller** mots de passe, tokens ou secrets — utiliser des variables d’environnement et la CI.

## Dernière mise à jour

- 2026-04-15 — **Sentry Expo** : `@sentry/react-native` (expo install), plugin dans `frontend/app.json`, `frontend/src/lib/sentryMobile.ts` + appel `initMobileSentry()` dans `frontend/app/_layout.tsx`, tests `sentryMobile.test.ts`, doc `docs/MOBILE_SENTRY.md`, tracker phase 12 mis à jour. Preuve : `npm run verify --prefix frontend` → exit 0.
- 2026-04-15 — **Tracker phases 0–24** : `docs/PHASES_0_24_CONTRACT_TRACKER.md` réécrit en **deux colonnes** — **Contrat dépôt (Git) = 100 % ✅** (preuves versionnées) vs **Extension produit & exploitation** (🎯 / 📋). Ajouts : `docs/MOBILE_SENTRY.md`, `frontend/.env.example` (Sentry Expo), lien inventaire ↔ tracker dans `INVENTAIRE_AUDIT.md`. `npm run verify:audit` → OK.
- 2026-04-15 — **Mega-cahier phases 0–24 (nouvelle relance)** : le document utilisateur décrit plusieurs mois d’ingénierie (E2E « Mamadou / Aminata / Admin » complets, k6 10k/100k, PDF, push prod). **Une session ne peut pas tout exécuter** ; le dépôt tranche déjà via `docs/PHASES_0_24_CONTRACT_TRACKER.md` et ce journal. **Preuve livraison (cette machine)** : `npm run verify:delivery` → exit **0** (`verify:audit` OK, Vitest PWA **330** tests OK, Expo `frontend/` lint **0 errors** + typecheck + Vitest **54** pass / **2** skip). **Backend smoke local** : `npm run test:smoke --prefix backend` → **échec** — `PrismaClientKnownRequestError` « column does not exist » sur `user.create` : la base pointée par `DATABASE_URL` n’est **pas alignée** sur `schema.prisma` (appliquer migrations sur l’URL de test : `npm run migrate:deploy --prefix backend` ou DB dédiée CI). **Sécurité** : ne pas coller mots de passe / tokens dans le chat ni dans des exemples versionnés ; utiliser `E2E_*`, GitHub Secrets, `playwright-credentials.local` ; **rotation** si des identifiants ont été publiés en clair. **Architecture** : app Expo canonique = **`frontend/`** ; `mobile-afriwonder/` = alias npm vers `../frontend` (pas un second code mobile). **Correctif session** : `frontend/src/config/shareUrls.test.ts` — imports en tête + `vi.mock` après (supprime 2 warnings `import/first` ; Vitest hisse toujours le mock).
- 2026-04-14 — **E2E personas — ergonomie locale** : `playwright.config.ts` charge optionnellement `tests/e2e/playwright-credentials.local` (gitignore) ; modèle `tests/e2e/playwright-credentials.sample` ; doc `.env.example`, `docs/CLIENT_DELIVERY_CONTRACT.md`, commentaires specs. Preuve Playwright : `npx playwright test tests/e2e/smoke-home.spec.ts --project=chromium-mobile` → 1 passed.
- 2026-04-14 — **Session agent (mega-spec 0–24)** : pas d’exécution intégrale du cahier (impossible en une passe) ; **preuves locales** : `npm run test:smoke --prefix backend` → 10/10 OK ; `npm run verify --prefix frontend` → exit 0 (21 warnings ESLint, 0 errors). `npm run verify:delivery` = `verify:audit` + `test:ci:frontend` + `verify:delivery:expo` — si la commande complète dépasse le délai shell, enchaîner ces trois étapes séparément. **Alias mobile** : `mobile-afriwonder/package.json` relaie vers `../frontend` (une seule app Expo).
- 2026-04-14 — **Expo (`frontend/`)** : sync push `POST /api/mobile/push-token` après login / session restaurée (`syncPushTokenWithBackend`), détection `projectId` EAS placeholder ; écran Réglages → Notifications : bouton « Autoriser et synchroniser le push ». Preuve : `npm run verify --prefix frontend` (lint warnings existants, 0 errors TS après fix).
- 2026-04-14 — **Relance** du même mega-cahier des charges : statut inchangé — livraison par **sprints** uniquement ; mobile Expo = dossier `frontend/` (alias attendu `mobile-afriwonder/`), même backend `backend/`, pas de refactor backend destructif, APIs complémentaires sous `/api/mobile/*` si besoin documenté dans `MOBILE_APIS.md`.
- 2026-04-14 — Mega-spec phases 0–24 reçue : **non exécutable en intégralité dans une seule passe** (plusieurs mois de dev + infra + credentials tiers). Périmètre traité ici : preuves automatisées locales + alignement honnête sur le tracker `docs/PHASES_0_24_CONTRACT_TRACKER.md`.
- 2026-04-14 — Agent : BLOC 4 amorcé — `data-testid` auth + `feed`, `#acceptTerms`, `personas-smoke.spec.ts` (`E2E_STAGING_*`) ; backend `biometric-session` ; journal racine ; `MOBILE_APIS.md`.
- 2026-04-14 — E2E personas : utilisateur + admin (`personas-admin-smoke.spec.ts`, `E2E_ADMIN_*`) ; accès admin : email `VITE_SUPER_ADMIN_EMAIL` suffit (voir `AdminDashboard.jsx`).

## Validé (fonctionnel + preuve commande)

| Horodatage | Sujet | Preuve |
|------------|--------|--------|
| 2026-04-14 | `GET /api/mobile/health` | Déjà couvert + `backend/__tests__/mobile.routes.test.ts` |
| 2026-04-14 | `data-testid` auth + `feed`, checkbox `#acceptTerms` | `src/pages/Landing.jsx`, `src/pages/Home.jsx` |
| 2026-04-14 | `POST /api/mobile/biometric-session` | Jest `mobile.routes.test.ts` + `MOBILE_APIS.md` |
| 2026-04-15 | Livraison PWA + Expo (gate contract) | `npm run verify:delivery` → exit 0 (audit dépôt + Vitest CI 330 tests + `frontend` 0 erreurs lint + typecheck + Vitest Expo 54 OK) |
| 2026-04-14 | Smoke backend | `npm run test:smoke --prefix backend` → 10/10 OK **si** DB test migrée (sur machine 2026-04-15 : échec décalage schéma) |

## Corrections appliquées

| Horodatage | Résumé | Fichiers |
|------------|--------|----------|
| 2026-04-15 | Lint Expo : `import/first` dans test `shareUrls` (mock Vitest toujours hissé) | `frontend/src/config/shareUrls.test.ts` |
| 2026-04-14 | API biométrie mobile (audit analytics) | `backend/src/routes/mobile.routes.ts`, `MOBILE_APIS.md`, tests |
| 2026-04-14 | Admin : accès Centre de contrôle si email = `VITE_SUPER_ADMIN_EMAIL` (évite blocage si rôle DB pas migré) | `src/pages/AdminDashboard.jsx` |
| 2026-04-14 | E2E smoke admin + user (`npm run test:e2e:personas`, vars `E2E_*`) | `tests/e2e/personas-admin-smoke.spec.ts`, `package.json` |

## Problèmes en cours / hors dépôt

- **Parcours Playwright complets** (spec « Mamadou 15 vidéos + like + commentaire + live + cadeau + offline », « Aminata upload + live + replay + highlight + retrait », « Admin modération + CSV + replays ») : **non automatisés** — exiger `data-testid` ciblés, médias de test, WebRTC/Agora, et comptes / données staging ; à découper en sprints.
- **Tests E2E contre production** : définir `PLAYWRIGHT_BASE_URL=https://afri-wonder.vercel.app` + secrets CI ; **ne jamais** commiter mots de passe ni les coller dans des exemples `curl` versionnés (utiliser `E2E_*` / GitHub Secrets).
- k6 « 10k / 100k users » : **uniquement** sur environnement dédié (`tests/load/afriwonder-load-test.js`, `K6_PROFILE`).
- PDF `RAPPORT_FINAL_AFRIWONDER.pdf` : `npm run report:final` → Markdown + JSON ; conversion PDF hors script si besoin.
- **Push `main` / Vercel** : non effectué depuis l’agent — à faire côté fondateur après revue.
- **Sécurité :** rotation des mots de passe s’ils ont été partagés en clair (chat, tickets).

## Score actuel du produit (indicatif — à mesurer)

- Tests : exécuter `npm run test:smoke --prefix backend`, `npm run verify:delivery`, `npm run test:coverage` pour chiffres à jour.
- Couverture : voir `backend/coverage/` et rapport Vitest racine après `npm run test:coverage`.
- Lighthouse : `npm run build` + `npm run preview` + `npm run lhci` (voir `lighthouserc.cjs`).

## Références

- Phases 0–24 (statut détaillé) : `docs/PHASES_0_24_CONTRACT_TRACKER.md`
- Runbook incident : `docs/INCIDENT_RESPONSE.md`
- Rapport agrégé : `npm run report:final` → `reports/RAPPORT_FINAL_AFRIWONDER.md`
