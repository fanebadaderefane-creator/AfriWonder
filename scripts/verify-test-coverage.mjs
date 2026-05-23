#!/usr/bin/env node
/**
 * Enchaîne les suites avec couverture (seuil 70 % déjà dans jest/vitest configs).
 * Usage local : définir DATABASE_URL pour le backend si besoin.
 * Variables : SKIP_BACKEND_COVERAGE=1 | SKIP_MOBILE_COVERAGE=1 | SKIP_PWA_COVERAGE=1
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(label, command, cwd = root) {
  console.log(`\n[verify-test-coverage] ${label}`);
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, CI: process.env.CI || 'true' },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.env.SKIP_BACKEND_COVERAGE !== '1') {
  run('Backend — Jest + couverture (seuil global jest.config.js)', 'npm run test:coverage', path.join(root, 'backend'));
} else {
  console.log('[verify-test-coverage] SKIP_BACKEND_COVERAGE=1 — backend ignoré.');
}

if (process.env.SKIP_MOBILE_COVERAGE !== '1') {
  run('Mobile — Vitest + couverture (frontend/vitest.config.ts)', 'npm run test:coverage', path.join(root, 'frontend'));
} else {
  console.log('[verify-test-coverage] SKIP_MOBILE_COVERAGE=1 — mobile ignoré.');
}

if (process.env.SKIP_PWA_COVERAGE !== '1') {
  run('PWA — Vitest + couverture (vitest.config.js racine)', 'npm run test:coverage', root);
} else {
  console.log('[verify-test-coverage] SKIP_PWA_COVERAGE=1 — PWA ignoré.');
}

console.log('\n[verify-test-coverage] OK — couverture exécutée sur les couches demandées.');
