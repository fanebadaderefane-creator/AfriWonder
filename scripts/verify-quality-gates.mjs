#!/usr/bin/env node
/**
 * Gates qualité alignés sur `.github/workflows/ci.yml` — job typecheck-and-lint.
 * À lancer depuis la racine du repo après `npm ci` dans `backend/` et `frontend/`.
 *
 * Ordre : standards diff → backend (Prisma + tsc + eslint erreurs) → mobile (tsc + eslint).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');

function run(label, command, cwd = root) {
  console.log(`\n[verify-quality-gates] ${label}`);
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('Engineering standards (diff)', 'node scripts/enforce-engineering-standards.mjs', root);
run('Backend — Prisma generate', 'npm run db:generate', backend);
run('Backend — tsc --noEmit', 'npx tsc --noEmit', backend);
run('Backend — eslint (erreurs)', 'npm run lint:errors-only', backend);
run('Mobile — tsc --noEmit', 'npm run typecheck', frontend);
run('Mobile — eslint', 'npx eslint app src --ext .ts,.tsx', frontend);

console.log('\n[verify-quality-gates] OK — tous les gates qualité sont passés.');
