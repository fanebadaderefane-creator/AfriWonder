# Rapport de conformité technique — Standards AfriWonder (Code/CI)

**Référence** : [ENGINEERING_STANDARDS.md](ENGINEERING_STANDARDS.md) v1.1  
**Date** : 2026-04-28  
**Périmètre** : automatisation vérifiable dans le dépôt (pas les rituels humains ni outils externes non branchés).

## Résumé

| Domaine                         | Statut      | Mécanisme |
|--------------------------------|-------------|-----------|
| Lint / typecheck bloquants     | Appliqué    | CI `typecheck-and-lint`, job unifié via `verify:quality-gates` |
| Taille PR ≤ 400 lignes         | Appliqué    | Job `pr-line-budget` |
| Couverture tests ≥ 70 %        | Appliqué    | `backend/jest.config.js`, `frontend/vitest.config.ts`, `vitest.config.js` + jobs CI |
| Audit dépendances high         | Appliqué    | `npm audit --audit-level=high` dans CI |
| Garde-fous diff (qualité code) | Appliqué    | `scripts/enforce-engineering-standards.mjs` |
| Secrets dans le diff           | Appliqué    | Patterns Stripe/AWS/PEM dans `enforce-engineering-standards.mjs` |
| Chaîne couverture locale       | Appliqué    | `npm run verify:test-coverage` |
| Cohérence version / changelog  | Appliqué    | `npm run verify:release-readiness` |
| Release progressive 5→100 %    | Non codé    | Process ops / stores ; pas de gate automatique dans ce repo |
| Monitoring prod (Sentry, etc.) | Partiel     | Dépend configuration secrets et runtime ; hors CI pur |
| Pentest / charge avant majeure | Manuel      | Scripts existants (`test:load:1000rps`, etc.) à exécuter hors CI standard |

## Commandes locales (ordre recommandé)

1. `npm run verify:engineering-standards` — rapide, nécessite git.
2. Après `npm ci` dans `backend/` et `frontend/` : `npm run verify:quality-gates`.
3. Avec DB test pour backend : `npm run verify:test-coverage` (variables `SKIP_*` pour ignorer une couche).
4. Avant release : `npm run verify:release-readiness`.

## CI

Le workflow [.github/workflows/ci.yml](../.github/workflows/ci.yml) enchaîne les jobs documentés dans le manuel (lint, tests, audit, E2E selon branches).

## Non automatisable dans le code seul

- Revue humaine, post-mortems, rétention J7, interviews utilisateurs.
- Déploiement progressif réel et rollback piloté par métriques (nécessite plateforme release).
- Conformité légale complète (export données, suppression compte) : à valider par parcours produit + juridique.

---

*Document vivant — mettre à jour lors de l’ajout de nouveaux scripts ou gates CI.*
