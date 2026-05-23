import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js', './src/test/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    testTimeout: 20000,
    hookTimeout: 15000,
    pool: 'forks',
    poolOptions: {
      forks: {
        // Limiter à 1 worker pour éviter OOM sur Windows (4 GB RAM disponible)
        maxForks: 1,
        minForks: 1,
      },
    },
    exclude: [
      'node_modules',
      'dist',
      'backend/**',
      'tests/e2e/**',
      '**/*.e2e.*',
      '**/e2e/**',
      // Exclure les smoke tests lourds (~116 tests) et Landing partout — trop lourds pour les runners
      '**/all-pages-smoke*.test.jsx',
      '**/Landing.test.jsx',
    ],
    // Ch.2.2 (manuel) : 70 % minimum sur le code mesuré. Comme le mobile (`frontend/vitest.config.ts`),
    // périmètre = modules déjà couverts par des tests ciblés (lib/utils/services), pas 100 % du bundle React d’un coup.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/logger.js',
        'src/lib/validators.js',
        'src/lib/csvService.js',
        'src/lib/app-params.js',
        'src/lib/preferences.js',
        'src/utils/commissions.js',
        'src/utils/index.ts',
        'src/utils/ordersOfflineCache.js',
        'src/services/offlineCache.service.js',
        'src/services/offlineStorage.service.js',
      ],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.test.*'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

