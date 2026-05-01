<!--
Merci pour ta contribution ! Ce template aide les reviewers à valider rapidement.
Lis AGENTS.md à la racine si tu ne l'as pas encore fait.
Une PR > 400 lignes est trop grande — découpe-la.
-->

## Type de changement

<!-- Coche une seule case principale -->
- [ ] `feat` — nouvelle fonctionnalité
- [ ] `fix` — correction de bug
- [ ] `perf` — amélioration de performance
- [ ] `refactor` — refactorisation sans changement de comportement
- [ ] `test` — ajout ou correction de tests
- [ ] `docs` — documentation uniquement
- [ ] `chore` / `ci` / `build` — outillage, CI, dépendances

## Résumé

<!-- En 2-3 phrases : pourquoi cette PR existe (le problème), pas le quoi (le diff). -->

## Lien backlog

<!-- Référence un ticket : Refs AFW-1234 ou Closes AFW-1234. -->

Refs: AFW-

## Captures / GIFs (si UI)

<!-- Avant / après côte à côte. Mentionner l'appareil testé (Android 10, écran 5", 3GB RAM). -->

## Périmètre touché

- [ ] Backend (`backend/`)
- [ ] Mobile Expo (`frontend/`)
- [ ] Web PWA (`src/`)
- [ ] SDK (`sdk/`)
- [ ] Docs (`docs/`)
- [ ] CI / scripts (`.github/`, `scripts/`)

## Checklist Definition of Done

<!-- Tu dois pouvoir cocher TOUTES ces cases avant de demander une review. -->

### Code
- [ ] Le code suit les standards d'`AGENTS.md` (séparation des couches, taille fichier ≤ 300 lignes, naming).
- [ ] Aucun `console.log`, `print`, `debugger` résiduel.
- [ ] Aucun secret commité (`.env`, clé API, token).
- [ ] Aucun `TODO` sans ticket associé : `// TODO(AFW-XXXX): ...`.
- [ ] Aucune dépendance ajoutée — ou ajoutée et justifiée dans `docs/DEPENDENCIES.md`.

### Tests
- [ ] Tests unitaires ajoutés/mis à jour dans le **même commit** que le code.
- [ ] Test de régression ajouté si correction de bug.
- [ ] Couverture du module touché ≥ 70 %.
- [ ] Tous les tests passent en local (`npm run test --prefix backend` / `npm run test:ci:frontend`).

### Sécurité
- [ ] Inputs validés côté serveur avec Zod (si endpoint API).
- [ ] Aucune PII dans les logs (email, téléphone, token, IP).
- [ ] Authentification + autorisation vérifiées (middleware `authenticate` + check de rôle).
- [ ] `npm audit --audit-level=high` ne remonte rien de nouveau.

### Performance (si mobile/feed/listes)
- [ ] Listes virtualisées (FlashList/FlatList) si > 20 items.
- [ ] Images via `expo-image` avec `cachePolicy: "memory-disk"`.
- [ ] Pas de re-render inutile (memoisation, comparateurs `React.memo`).
- [ ] Testé sur appareil 2-3 GB RAM ou émulateur équivalent.
- [ ] Budget de performance respecté ([`docs/PERFORMANCE_BUDGETS.md`](../docs/PERFORMANCE_BUDGETS.md)).

### Documentation
- [ ] README/Swagger mis à jour si API publique modifiée.
- [ ] ADR ajouté dans `docs/decisions/` si décision structurelle.
- [ ] Glossaire mis à jour si nouveau concept introduit.
- [ ] CHANGELOG mis à jour (catégorie correcte : Added/Changed/Deprecated/Removed/Fixed/Security).

### UX / i18n (si frontend)
- [ ] Toutes les chaînes UI passent par `frontend/src/i18n/translations.ts`.
- [ ] Messages d'erreur lisibles en français — pas de `undefined error`.
- [ ] Format FCFA + fr-FR pour montants/dates.
- [ ] Bouton retour cohérent ([`.cursor/rules/navigation-back-arrow.mdc`](../.cursor/rules/navigation-back-arrow.mdc)).

## Impact rollback

<!-- Cette PR est-elle rétrocompatible ?
     Y a-t-il une migration de DB ? Si oui, est-elle réversible ?
     Quel est le risque d'un rollback en prod ? -->

- [ ] Rétrocompatible (rollback safe).
- [ ] Migration DB nécessaire — décrire comment rollback :

## Tests manuels effectués

<!-- Décris ce que tu as testé toi-même avant d'ouvrir la PR.
     Au minimum : parcours principal + 1 cas d'erreur. -->

- [ ] Parcours nominal :
- [ ] Cas d'erreur :
- [ ] Sur Android 10, écran 5", 3 GB RAM (ou équivalent) :
- [ ] Sur 3G simulé :

## Reviewers suggérés

<!-- @lead-tech pour les changements structurels.
     Pour les features critiques (paiement, auth, KYC, modération), 2 reviewers seniors. -->

/cc

---

> En soumettant cette PR, je confirme avoir lu [`AGENTS.md`](../AGENTS.md) et respecté les standards [`docs/ENGINEERING_STANDARDS.md`](../docs/ENGINEERING_STANDARDS.md).
