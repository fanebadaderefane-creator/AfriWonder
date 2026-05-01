#!/usr/bin/env node
/**
 * Preuve de livraison : audit dépôt + tests PWA avec couverture (seuils ch.2.2, `vitest.config.js`).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

if (process.env.CI == null || process.env.CI === '') {
  process.env.CI = 'true';
}

function npmRun(script) {
  return spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
}

const sequence = [
  'verify:audit',
  'verify:engineering-standards',
  'verify:release-readiness',
  'verify:quality-gates',
  'verify:test-coverage',
  'verify:delivery:expo',
];

for (const script of sequence) {
  const result = npmRun(script);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

process.exit(0);
