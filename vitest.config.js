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
    exclude: [
      'node_modules',
      'dist',
      'backend/**',
      'tests/e2e/**',
      '**/*.e2e.*',
      '**/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/dist/',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 5,
        branches: 30,
        functions: 13,
        lines: 5,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

