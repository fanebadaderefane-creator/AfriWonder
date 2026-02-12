# Atteindre 100 % de couverture (frontend et backend)

Pour que **tout le tableau de couverture soit à 100 % et vert**, voici comment faire.

## Frontend (`npm run test:coverage`)

### 0. Objectif 100 % (tout le code testé)

La couverture inclut **tout** `src/**`. Aucune fonctionnalité n'est exclue (sauf exclusions techniques). L'objectif est 100 % ; augmenter coverage.thresholds au fur et à mesure. Seuls ces fichiers sont mesurés et le seuil global est 100 %. Le rapport affiche donc un tableau entièrement vert. Pour inclure d’autres fichiers, les ajouter dans `vitest.config.js` → `coverage.include` et s’assurer qu’ils ont 100 % de couverture (sinon le build échoue).

### 1. Fichiers déjà exclus (rapport plus propre)

Si tu repasses en `include: ['src/**']`, ces fichiers sont exclus du rapport :

- `src/main.jsx` (point d’entrée)
- `src/sw-custom.js` (service worker)
- `src/api/expressClient.js` (client API volumineux, souvent testé en E2E)
- `**/pages.config.*` (config des routes)

Tu peux en exclure d’autres dans `coverage.exclude` si tu ne veux pas les faire monter à 100 %.

### 2. Activer les seuils à 100 %

Dans `vitest.config.js`, section `coverage.thresholds`, remplace par :

```js
thresholds: {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
},
```

Ensuite : `npm run test:coverage` **échouera** tant que la couverture globale n’atteint pas 100 %.

### 3. Comment atteindre 100 %

- **Option A** : écrire des tests pour chaque fichier restant dans le rapport jusqu’à ce que statements, branches, functions et lines soient à 100 %.
- **Option B** : exclure encore des fichiers dans `coverage.exclude` (par ex. dossiers entiers comme `src/components/legal`, `src/components/ai`) pour ne garder que le code que tu veux couvrir à 100 %. Puis ajouter des tests pour ces fichiers uniquement.

Conseil : monter les seuils progressivement (ex. 50 %, puis 80 %, puis 100 %) et ajouter des tests au fur et à mesure.

---

## Backend (`npm run test:coverage` dans `backend/`)

### 1. Fichiers exclus

Dans `backend/jest.config.js`, `collectCoverageFrom` exclut déjà :

- `**/*.d.ts`
- `**/__tests__/**`
- `src/index.ts`

Tu peux ajouter d’autres exclusions, par ex. :

```js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/**/__tests__/**',
  '!src/index.ts',
  // '!src/migrations/**',  // si tu ne testes pas les migrations
],
```

### 2. Seuils à 100 %

Dans `backend/jest.config.js`, section `coverageThreshold`, remplace par :

```js
coverageThreshold: {
  global: {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  },
},
```

Puis : `cd backend && npm run test:coverage` échouera tant que la couverture globale n’est pas à 100 %.

### 3. Comment atteindre 100 %

- Ajouter des tests dans `backend/src/**/__tests__/` pour chaque module jusqu’à atteindre 100 % sur les fichiers collectés.
- Ou exclure des fichiers dans `collectCoverageFrom` pour ne viser 100 % que sur une partie du code.

---

## Résumé

| Objectif | Frontend | Backend |
|----------|----------|--------|
| Seuils à 100 % | `vitest.config.js` → `coverage.thresholds` → 100 partout | `backend/jest.config.js` → `coverageThreshold.global` → 100 partout |
| Réduire la portée | `coverage.exclude` (vitest) | `collectCoverageFrom` avec `!src/...` (jest) |
| Faire passer le build | Ajouter des tests jusqu’à 100 %, ou exclure des fichiers |

Une fois les seuils à 100 % et assez de tests (ou exclusions) en place, le tableau sera vert à 100 %.
