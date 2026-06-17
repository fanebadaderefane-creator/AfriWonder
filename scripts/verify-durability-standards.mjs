#!/usr/bin/env node
/**
 * Vérification exécutable des standards durabilité (périmètre code/CI).
 * Cette commande centralise les contrôles techniques automatisables.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function run(script) {
  console.log(`\n[verify-durability-standards] npm run ${script}`);
  const res = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      CI: process.env.CI || 'true',
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=8192'].filter(Boolean).join(' '),
    },
  });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// Ordre aligné sur le manuel: qualité -> tests -> sécurité -> release/readiness.
run('verify:engineering-standards');
run('verify:quality-gates');
run('verify:test-coverage');
run('security-audit');
run('verify:release-readiness');

console.log('\n[verify-durability-standards] OK — standards techniques appliqués.');
