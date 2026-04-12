#!/usr/bin/env node
/**
 * Preuve de livraison : audit dépôt + tests front.
 * Définit CI=true par défaut (exclut les smoke tests lourds du vitest.config) si CI n'est pas déjà défini.
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

const audit = npmRun('verify:audit');
if (audit.status !== 0) {
  process.exit(audit.status ?? 1);
}

const tests = npmRun('test:ci:frontend');
if (tests.status !== 0) {
  process.exit(tests.status ?? 1);
}

const expo = npmRun('verify:delivery:expo');
process.exit(expo.status ?? 0);
