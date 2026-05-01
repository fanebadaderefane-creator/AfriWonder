# AGENTS.md — Standards d'ingénierie AfriWonder

> **Ce fichier est lu automatiquement par tous les agents de codage** (Cursor, Claude Code, Copilot, etc.) et par tous les humains qui ouvrent ce repo. Il est la version **courte et exécutable** des standards ; le **manuel long** (« construire pour des années ») : [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md) — index par libellé *durabilité* : [`docs/DURABILITY_STANDARDS.md`](docs/DURABILITY_STANDARDS.md).

> **Marché cible** : Mali → Afrique. Réseaux instables, appareils 2-3 GB de RAM, données mobiles coûteuses.

---

## 1. Structure du repo

```
afriwonder/
├── backend/           # API Express + Prisma + PostgreSQL (Node 20)
├── frontend/          # App mobile Expo React Native (Android 10+, iOS 14+)
├── src/               # PWA web (Vite + React 18 + Tailwind)
├── sdk/               # SDKs publics (afriwonder-miniapp-sdk)
├── docs/              # Documentation vivante (ENGINEERING_STANDARDS, DURABILITY_STANDARDS, RUNBOOK, ADR)
├── scripts/           # Scripts de vérification, audit, build
├── tests/e2e/         # Playwright (web)
└── .github/workflows/ # CI/CD
```

| Couche | Stack | Tests | Lint |
|---|---|---|---|
| Backend | Express + Prisma + Zod + Jest | `npm run test:coverage --prefix backend` | `npm run lint --prefix backend` |
| Mobile | Expo + RN + Zustand + Vitest | `npm run typecheck --prefix frontend` | `npm run lint --prefix frontend` |
| Web | Vite + React + Vitest + Playwright | `npm run test:ci:frontend` + `npm run test:e2e:ci` | `npm run lint` |

---

## 2. Les 10 commandements (non négociables)

1. **Tu ne pousseras jamais directement sur `main`** — toujours une branche, toujours une PR.
2. **Tu ne livreras pas sans tests** — code sans tests = dette technique garantie.
3. **Tu nommeras tes variables clairement** — pas de `x`, `temp`, `data2`, `handler2`.
4. **Tu documenteras tes décisions** — un ADR dans `docs/decisions/` pour chaque choix structurel.
5. **Tu corrigeras les bugs à leur source** — un patch sur un patch crée une bombe à retardement.
6. **Tu communiqueras un blocage immédiatement** — rester bloqué 4h seul est un échec d'équipe.
7. **Tu liras le code des autres** — la review n'est pas une vérification, c'est un apprentissage.
8. **Tu te soucieras des performances** — ce qui est lent pour toi est inutilisable sur 3G.
9. **Tu penseras à l'utilisateur final** — l'interface est le manuel.
10. **Tu amélioreras le code en le touchant** — laisse chaque fichier dans un meilleur état que tu l'as trouvé.

---

## 3. Definition of Done (DoD) — une feature est livrée si

- [ ] Implémentée frontend ET backend connectés (pas de mock résiduel).
- [ ] Tests unitaires écrits dans le **même commit** que le code.
- [ ] Test de régression ajouté pour chaque bug corrigé.
- [ ] Couverture du module touché ≥ 70 %.
- [ ] Aucun `TODO` sans ticket dans le backlog.
- [ ] Aucun `console.log`, `print`, `debugger` résiduel.
- [ ] Tous les inputs validés côté serveur (Zod).
- [ ] Aucune PII (email, téléphone, token) dans les logs.
- [ ] Messages d'erreur lisibles en français — jamais de `undefined error`, `handler failed`.
- [ ] UI testée sur écran 5" + appareil 2-3 GB RAM (ou Android Studio profile équivalent).
- [ ] Performance budget respecté (voir §6).
- [ ] Documentation à jour (README/ADR/Swagger si API).
- [ ] Reviewed par 1 senior minimum (2 si feature critique).
- [ ] CI verte (typecheck + lint + tests + security).

---

## 4. Architecture — règles obligatoires

| Règle | Standard |
|---|---|
| Séparation des couches | UI / logique métier / données — jamais mélangées dans un même fichier |
| Modules indépendants | Chaque feature est un module isolé (`backend/src/services/<feature>.service.ts`, `frontend/src/<feature>/`) |
| API versionnée | Toute API publique passe par `/api/v1/` (les nouveaux endpoints) ; pas de breaking change sans `/v2/` |
| Configuration externalisée | Aucune URL, clé, ID hardcodé — toujours `process.env.*` ou `frontend/src/config/api.ts` |
| Pas de logique dans l'UI | Les écrans affichent. Ils ne calculent pas. La logique va dans `services/` ou hooks dédiés |
| Dépendances justifiées | Toute nouvelle lib tierce ajoute une ligne dans [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) (raison + alternative écartée) |
| Taille de fichier max | **300 lignes** — au-delà, refactoriser en sous-modules. Warning CI à 300, bloquant à 500 |

---

## 5. Standards de code

- **Linter automatique** — zéro exception (`eslint` configuré dans backend/, frontend/, racine).
- **Une fonction = une responsabilité** — si `&&` dans le nom ou `or` dans le commentaire, couper.
- **Zéro duplication** — si tu copies, tu crées une fonction utilitaire.
- **Commentaires d'intention** — explique le *pourquoi*, jamais le *quoi*.
- **Pas de TODO orphelin** — chaque `TODO` cite un ticket : `// TODO(AFW-1234): ...`.
- **Pas de magic numbers** — extrais en constante nommée.
- **Imports ordonnés** — externes → internes → relatifs → types.

### Naming conventions

| Élément | Convention | Exemple |
|---|---|---|
| Fichiers TS | `kebab-case.ts` | `paid-call.service.ts` |
| Composants RN/React | `PascalCase.tsx` | `StarProfileCard.tsx` |
| Hooks | `useCamelCase.ts` | `useFeedAutoplay.ts` |
| Services backend | `<domaine>.service.ts` | `wallet.service.ts` |
| Routes backend | `<domaine>.routes.ts` | `tontines.routes.ts` |
| Migrations Prisma | `YYYYMMDDHHMMSS_<snake_case>` | `20260424_tontines` |

---

## 6. Performance budgets (mobile prioritaire — Mali/Afrique)

| Métrique | Limite | Action si dépassé |
|---|---|---|
| Cold start (mobile) | < 2 s | Optimisation obligatoire avant release |
| Chargement écran (cache chaud) | < 1 s | Lazy loading + revue archi |
| Réponse API critique (P95) | < 300 ms | Optim backend / index DB / CDN |
| Taille APK | < 50 MB | Audit assets + suppression inutiles |
| RAM en utilisation normale | < 150 MB | Audit fuites mémoire |
| Image après compression | < 200 KB | Pipeline `sharp` obligatoire |
| FPS scroll feed | 60 FPS constant | Virtualisation + memoization |
| TTI sur 3G | < 5 s | Inline requires + skeleton screens |

Voir [`docs/PERFORMANCE_BUDGETS.md`](docs/PERFORMANCE_BUDGETS.md) pour les méthodes de mesure.

---

## 7. Sécurité — règles absolues

- Mots de passe : **bcrypt** (déjà en place) — jamais MD5, jamais en clair.
- JWT access : **15 min** — refresh token séparé (`JWT_REFRESH_SECRET`).
- Données sensibles : chiffrées au repos ET en transit (TLS 1.3 minimum).
- Inputs : **toujours validés côté serveur** avec Zod — jamais faire confiance au client.
- Secrets : **jamais dans le code**, toujours `.env` + EAS secrets / Vercel env.
- Logs : **aucune PII** (email, téléphone, token, IP). Utilise `userId` uniquement.
- Dépendances : `npm audit --audit-level=high` bloquant en CI (déjà actif).
- Principe du moindre privilège : chaque rôle accède uniquement à ce qu'il faut.

### Avant chaque commit, vérifier

```bash
# Backend
cd backend && npm run lint && npx tsc --noEmit
# Mobile
cd frontend && npm run lint && npm run typecheck
# Web
npm run lint && npm run typecheck
```

---

## 8. Tests — pyramide obligatoire

```
       /\         E2E   5-10 %  (Playwright web, Maestro mobile)
      /  \        Intégration  20-30 %  (Jest + supertest, Vitest + RTL)
     /    \       Unitaires    60-70 %  (Jest backend, Vitest frontend/web)
    /______\
```

- **Toute nouvelle feature** livre ses tests unitaires dans le même commit.
- **Tout bug corrigé** génère un test de régression — pour qu'il ne revienne jamais.
- **Couverture minimum** : 70 % sur le code mesuré — **garanti en CI** par Jest (`backend/jest.config.js` → `collectCoverageFrom`), Vitest mobile (`frontend/vitest.config.ts` → `coverage.include`) et Vitest PWA racine (`vitest.config.js` → `coverage.include`) ; voir [`docs/COVERAGE.md`](docs/COVERAGE.md).
- **Tests flaky interdits** — un test qui passe une fois sur deux est supprimé ou corrigé immédiatement.
- **Suite unit < 5 min** sinon on parallélise.

---

## 9. Workflow PR

| Règle | Standard |
|---|---|
| Taille PR | ≤ 400 lignes diff (warning CI au-delà). PR plus large doit être découpée. |
| Reviewers | 1 senior minimum, 2 si feature critique (paiement, auth, KYC, modération). |
| Délai review | 24 h max — au-delà, c'est une urgence. |
| Critères merge | Logique correcte + tests + lisibilité + sécurité + DoD §3. |
| Branches protégées | `main` et `develop` interdits en push direct (configuré côté GitHub). |
| Merge | Squash merge avec message Conventional Commits. |

### Format des commits (Conventional Commits)

```
<type>(<scope>): <description courte impérative>

[corps optionnel : pourquoi, pas quoi]

[footer : Refs AFW-1234, BREAKING CHANGE: ...]
```

Types : `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `revert`.

---

## 10. Mobile — spécificités Afrique / Mali

- **Android 10+** minimum (>80 % du parc Mali).
- **Offline partiel** : l'app reste utilisable sans connexion (cache + queue d'actions).
- **Test obligatoire** sur appareil 2-3 GB RAM (ou émulateur profil équivalent).
- **Compression d'images agressive** (`sharp` côté backend + `expo-image` cache mémoire+disque côté mobile).
- **UI tactile 5"** — boutons ≥ 44×44 dp, contrastes AA minimum.
- **Localisation** : français par défaut, FCFA, +223 (Mali), format JJ/MM/AAAA.
- **APK < 50 MB** — auditer à chaque release.

Voir [`.cursor/rules/mobile-frontend-quality-api-parity.mdc`](.cursor/rules/mobile-frontend-quality-api-parity.mdc) et [`.cursor/rules/mobile-android-backend-url.mdc`](.cursor/rules/mobile-android-backend-url.mdc).

---

## 11. Process incident & monitoring

| Sévérité | Définition | Réponse |
|---|---|---|
| **SEV-1** | App inaccessible, crash massif, fuite données | 5 min — tout le monde |
| **SEV-2** | Feature majeure cassée (paiement, login, feed) | 30 min — lead + dev concerné |
| **SEV-3** | Comportement incorrect non bloquant | 4 h — dev assigné |
| **SEV-4** | Bug mineur / cosmétique | Prochain sprint |

Tout SEV-1/SEV-2 → post-mortem écrit dans les 48 h ([`docs/POSTMORTEM_TEMPLATE.md`](docs/POSTMORTEM_TEMPLATE.md)).

Outils en production :
- **Sentry** (backend + frontend + mobile) — toute erreur non gérée → alerte.
- **Crashlytics** (mobile) — crash rate > 0.5 % → alerte.
- **Uptime monitor** — downtime > 1 min → SMS.
- **Logs centralisés** (Pino backend) — erreur 5xx > 1 % → alerte.

---

## 12. Pour les agents IA — règles spécifiques

Quand tu écris du code dans ce repo :

1. **Lis avant d'écrire** — utilise toujours `Read` ou équivalent avant `StrReplace`/`Write`.
2. **Petits diffs** — préfère plusieurs PR atomiques à un méga-diff.
3. **Pas de fichier > 300 lignes** créé from scratch — découpe en modules dès le départ.
4. **Pas de breaking change silencieux** — annonce-le, propose une migration.
5. **Toujours typecheck + lint** avant de marquer une tâche `completed`.
6. **Pas de dépendance ajoutée sans justification écrite** dans la PR + `docs/DEPENDENCIES.md`.
7. **Pas de logique métier dupliquée** — relis ce qui existe (`SemanticSearch`, `Grep`).
8. **Respecte les rules `.cursor/rules/`** — elles sont prioritaires sur ce fichier en cas de conflit ciblé.
9. **Internationalisation** — toute chaîne UI passe par `frontend/src/i18n/translations.ts`.
10. **Sécurité** — toute nouvelle route a son `authenticate` middleware + validation Zod.

---

## 13. Liens utiles

- [`docs/ENGINEERING_STANDARDS.md`](docs/ENGINEERING_STANDARDS.md) — manuel long (durabilité, 11 chapitres)
- [`docs/DURABILITY_STANDARDS.md`](docs/DURABILITY_STANDARDS.md) — entrée *durabilité* (pointe vers le manuel long)
- **CI** : le pipeline [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) exécute les gates du manuel (lint, typecheck, tests backend + PWA + **Expo** + audit mobile, E2E). En local : `npm run verify:quality-gates` (après `npm ci` dans `backend/` et `frontend/`), `npm run verify:test-coverage`, `npm run verify:release-readiness` ; mobile seul : `npm run standards:expo` ; détail : [`frontend/README.md`](frontend/README.md).
- [`docs/STANDARDS_CONFORMANCE_REPORT.md`](docs/STANDARDS_CONFORMANCE_REPORT.md) — ce qui est automatiquement vérifié dans le repo vs process manuel.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture détaillée
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — runbook ops
- [`docs/SECURITY.md`](docs/SECURITY.md) — politique de sécurité
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — guide contributeur
- [`docs/PERFORMANCE_BUDGETS.md`](docs/PERFORMANCE_BUDGETS.md) — budgets perf chiffrés *(Sprint 3)*
- [`docs/decisions/`](docs/decisions/) — ADR *(Sprint 4)*
- [`.cursor/rules/`](.cursor/rules/) — règles Cursor par domaine

---

> **Document vivant — version 1.0 — 2026-04-25**
> Mise à jour à chaque sprint de revue de la dette (mensuelle).
> Toute proposition d'amendement passe par une PR avec 2 reviewers seniors.
