import { defineConfig } from 'vitest/config';

/**
 * Vitest (Expo / React Native) — couverture ch.2.2 du manuel
 * `docs/ENGINEERING_STANDARDS.md` (seuil 70 % sur `coverage.include`).
 * Éviter de charger le `postcss.config.js` du repo (Tailwind) quand on lance Vitest depuis `frontend/`.
 */
export default defineConfig({
  root: __dirname,
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'e2e/**/*.test.ts'],
    passWithNoTests: false,
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    // Ch.2.2 (manuel durabilité) : ≥ 70 % sur le périmètre `include` (pas tout l’arbre `app/` d’un coup).
    // Ch.2.4 : exécuter `npm run test:coverage` — la CI émet un warning si la suite dépasse 5 minutes.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Fichiers couverts par les suites `*.test.ts` (pas tout le dossier config/utils).
      include: [
        'src/config/devBackendHostUtils.ts',
        'src/config/oauthEnv.ts',
        'src/config/shareUrls.ts',
        'src/utils/urlNormalize.ts',
        'src/utils/mobileDeepLink.ts',
        'src/lib/sentryMobile.ts',
        'src/live/netInfoLiveQuality.ts',
        'src/live/liveCoinMmFees.ts',
        'src/utils/serviceVisualPlaceholders.ts',
        'src/demo/superAppDemoSeed.ts',
        'src/config/googleNativeOAuthRedirect.ts',
        'src/config/googleInstalledAppRedirect.ts',
        'src/emergency/maliEmergencyNumbers.ts',
      ],
      exclude: ['**/*.d.ts', '**/*.test.ts'],
      thresholds: {
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 70,
      },
    },
  },
});
