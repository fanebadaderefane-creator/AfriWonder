// Backend ESLint flat config (ESM).
// Niveau « gate v1 » : on bloque uniquement sur les vraies erreurs
// (variables non définies, syntaxe cassée, var au lieu de let/const).
// Le reste passe en warning et sera durci sprint après sprint —
// voir docs/ENGINEERING_STANDARDS.md §1.2.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'prisma/migrations/**',
      'prisma/generated/**',
      'src/generated/**',
      'scripts/**',
      'docs/**',
    ],
  },
  // Base JS/ESM rules
  js.configs.recommended,

  // TS files (type-aware not enabled — coût trop élevé pour CI actuelle)
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Node + Jest globals — évite no-undef sur process, console, jest, etc.
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        crypto: 'readonly',
        // Jest
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // === Erreurs structurelles (bloquantes) ===
      'no-var': 'error',
      'no-undef': 'off', // TS s'en charge mieux que ESLint
      'no-debugger': 'error',
      'no-duplicate-case': 'error',

      // === Warnings — dette identifiée à rembourser
      // (voir docs/LINT_DEBT.md). Toutes les nouvelles règles passent
      // d'abord en `warn` pour ne pas bloquer ; promotion en `error`
      // sprint par sprint dès que le compteur tombe à 0.
      'no-unused-vars': 'off',
      // Désactivé v1 (centaines d’héritages). Activer de nouveau avec ciblage par dossier
      // une fois le dead code / imports nettoyés ; alternative : `tsc` avec noUnused* à terme.
      '@typescript-eslint/no-unused-vars': 'off',
      // Copié/collé depuis outils bureautiques (espaces insécables) : pas bloquant, dépollution ciblée plutôt qu’en dur.
      'no-irregular-whitespace': 'off',
      // `case foo: { const x = ... }` hérité : durcir une fois le BI refactoré
      'no-case-declarations': 'off',
      // Dette héritée (services Prisma / JSON / intégrations) : 1000+ occurrences.
      // Les nouveaux modules doivent préférer des types explicites ou `unknown` + narrowing.
      // Promotion en `warn` ciblée (ex. routes) : sprint dédié (cf. commentaire v1 dans ce fichier).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      // require() ponctuel (Sentry, workers) : préférer `import()` à terme
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        { 'ts-ignore': 'allow-with-description', 'ts-expect-error': 'allow-with-description' },
      ],
      'prefer-const': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': 'off', // backend logue volontairement via console (Pino réservé aux services)

      // === Sécurité & qualité — soft mais visible ===
      eqeqeq: ['warn', 'smart'],
      'no-throw-literal': 'warn',
    },
  },

  // Tests : assouplissements légitimes
  {
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
