# Contrat de livraison client (AfriWonder)

Document **court** pour aligner équipe, client et sessions d’assistance (Cursor, etc.) : **même besoin = même preuve**, pas de promesse sans livraison mesurable.

## 1. Définition de « terminé »

Une demande est **terminée** seulement si **toutes** les conditions applicables sont vraies :

| Critère | Exigence |
|--------|-----------|
| Code | Les changements sont **dans le dépôt** (fichiers suivis), pas seulement décrits dans le chat. |
| Périmètre | Le comportement demandé est **implémenté** ; ce qui est volontairement exclu est **nommé** (ex. « non fait : déplacement massif des `.md` »). |
| Régression | Les zones **verrouillées** (player `VideoCard`, règles feed Firefox / like-scroll-son) n’ont pas été modifiées **sans** instruction explicite. |
| Vérification | Les commandes ci-dessous passent **ou** l’écart est documenté (test flaky, env manquant). |

## 2. Commandes de preuve (à lancer avant de dire « c’est bon »)

À la racine du repo :

```bash
npm run verify:delivery
```

`verify:delivery` enchaîne désormais : `verify:audit`, tests Vitest **PWA** (`src/`), puis **`verify:delivery:expo`** (lint + typecheck + tests unitaires dans `frontend/`). Pour vérifier **uniquement** l’app Expo : `npm run verify:delivery:expo`.

Par défaut, le script définit **`CI=true`** si la variable `CI` n’est pas déjà définie (aligné avec `vitest.config.js` : exclusion des smoke tests lourds). Pour forcer **tous** les tests front y compris smoke / `Landing.test`, lancer avec `CI=false` ou `CI=` vide selon votre shell.

Sur une machine où la suite Vitest complète manque de mémoire (Windows / gros repo) :

```bash
set NODE_OPTIONS=--max-old-space-size=8192
npm run verify:delivery
```

(PowerShell : `$env:NODE_OPTIONS="--max-old-space-size=8192"` puis `npm run verify:delivery`.)

Cela enchaîne :

- `npm run verify:audit` — artefacts attendus (dépôt, audits).
- `npm run test:ci:frontend` — tests Vitest front (rapide, CI-friendly).

Pour une modification **backend** :

```bash
npm run test:smoke --prefix backend
```

Pour une passe complète (plus long) :

```bash
npm run test:all
```

## 3. Ce que le client peut exiger en revue

- **Diff Git** de la session (ou PR) limité au besoin.
- **Résultat** de `npm run verify:delivery` (copie terminal ou log CI).
- **Liste honnête** des points audit encore 🟡 / 📋 dans `docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md` si la demande concernait un audit.

## 4. Limites honnêtes

- **Push / Render / stores** : hors du dépôt ; la livraison s’arrête à « prêt à pousser » si l’équipe déploie manuellement.
- **Sessions IA** : une conversation peut **s’illusionner** ; la règle `.cursor/rules/client-delivery-integrity.mdc` impose de **ne pas** confondre explication et modification de fichiers.

## 5. Révision

Adapter ce document si de nouvelles barrières CI ou de nouveaux livrables deviennent le standard minimal.
