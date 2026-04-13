import { defineConfig } from 'vitest/config';

/** Avoid loading repo-root `postcss.config.js` (Tailwind) when running Vitest from `frontend/`. */
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
  },
});
