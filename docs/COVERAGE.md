# Atteindre 100 % de couverture (frontend et backend)

**CI** : le manuel [`ENGINEERING_STANDARDS.md`](./ENGINEERING_STANDARDS.md) (ch.2.2) impose **au minimum 70 %** sur le code mesuré : **Jest** (`backend/jest.config.js` → `collectCoverageFrom` + `coverageThreshold` **70 %** sur les quatre métriques) ; **Vitest** mobile (`frontend/vitest.config.ts`) ; **Vitest PWA** racine (`vitest.config.js` → `coverage.include` + `thresholds` **70 %**). Tant que le backend n’atteint pas 70 % sur `collectCoverageFrom`, `npm run test:coverage` côté API échoue (dette à combler : tests / réduction de périmètre instrumenté = décision d’équipe documentée).

Pour que **tout le tableau de couverture soit à 100 % et vert** (objectif d’audit local optionnel), voici comment faire.

## Frontend (`npm run test:coverage`)

### 0. Périmètre mesuré (CI)

En CI, le **requis 70 %** s’applique aux fichiers listés dans `vitest.config.js` → `coverage.include` (modules lib/utils/services déjà couverts par des tests unitaires), pas à l’intégralité de l’arbre React.

### 1. Objectif 100 % (audit local optionnel)

Si tu veux un rapport « tout `src/**` vert », repasse en `include: ['src/**']` (ou liste élargie), ajuste `coverage.exclude`, puis monter `thresholds` progressivement. Ce n’est pas le gate par défaut du manuel (ch.2.2 = **70 %** sur le code mesuré).

### 2. Fichiers déjà exclus (rapport 100 % plus propre)

Si tu repasses en `include: ['src/**']`, ces fichiers sont exclus du rapport :

- `src/main.jsx` (point d’entrée)
- `src/sw-custom.js` (service worker)
- `src/api/expressClient.js` (client API volumineux, souvent testé en E2E)
- `**/pages.config.*` (config des routes)

Tu peux en exclure d’autres dans `coverage.exclude` si tu ne veux pas les faire monter à 100 %.

### 3. Activer les seuils à 100 %

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

### 4. Comment atteindre 100 %

- **Option A** : écrire des tests pour chaque fichier restant dans le rapport jusqu’à ce que statements, branches, functions et lines soient à 100 %.
- **Option B** : exclure encore des fichiers dans `coverage.exclude` (par ex. dossiers entiers comme `src/components/legal`, `src/components/ai`) pour ne garder que le code que tu veux couvrir à 100 %. Puis ajouter des tests pour ces fichiers uniquement.

Conseil : monter les seuils progressivement (ex. 50 %, puis 80 %, puis 100 %) et ajouter des tests au fur et à mesure.

---

## Backend (`npm run test:coverage` dans `backend/`)

**CI** : `coverageThreshold.global` est à **70 %** (quatre métriques) sur `collectCoverageFrom` — voir `backend/jest.config.js`.

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

| Objectif | Frontend (PWA) | Backend |
|----------|----------------|--------|
| **Gate CI (manuel ch.2.2)** | `vitest.config.js` → `coverage.include` + `thresholds` 70 % | `jest.config.js` → `coverageThreshold` 70 % sur `collectCoverageFrom` |
| Seuils à 100 % (optionnel) | `coverage.thresholds` → 100 + `include` élargi | `coverageThreshold.global` → 100 |
| Réduire la portée | `coverage.include` / `exclude` | `collectCoverageFrom` avec `!src/...` (jest) |

Le gate 70 % est l’exigence par défaut ; le 100 % reste un objectif d’audit local optionnel.
