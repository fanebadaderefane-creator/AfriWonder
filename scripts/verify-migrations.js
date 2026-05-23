#!/usr/bin/env node
/**
 * Vérification et exécution des migrations Prisma.
 * À lancer depuis la racine du projet (npm run verify-migrations).
 * Nécessite backend/.env avec DATABASE_URL pour status/deploy.
 */

import { execSync, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');

function run(cmd, cwd, description = cmd) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
    return { ok: true };
  } catch (e) {
    return { ok: false, status: e.status, message: e.message };
  }
}

console.log('=== Vérification des migrations AfriWonder ===\n');

// 1. Prisma generate (pas besoin de DB)
console.log('1. Prisma generate…');
const gen = run('npx prisma generate', BACKEND);
if (!gen.ok) {
  console.error('   Échec. Corrigez le schéma Prisma puis réessayez.');
  process.exit(1);
}
console.log('   OK\n');

// 2. Migrations : status puis deploy si demandé
const doDeploy = process.argv.includes('--deploy');
console.log('2. Migrations Prisma');
console.log('   DATABASE_URL doit être défini dans backend/.env\n');

const statusResult = spawnSync('npx', ['prisma', 'migrate', 'status'], {
  cwd: BACKEND,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  encoding: 'utf-8',
});

const out = (statusResult.stdout || '') + (statusResult.stderr || '');
const statusOk = statusResult.status === 0;

if (statusOk) {
  if (out.includes('pending') || out.includes('following migration(s) have not yet been applied')) {
    console.log('   Il reste des migrations non appliquées.');
    if (doDeploy) {
      console.log('   Exécution de prisma migrate deploy…\n');
      const deploy = run('npx prisma migrate deploy', BACKEND);
      if (deploy.ok) {
        console.log('   Toutes les migrations ont été appliquées.\n');
      } else {
        console.error('   Échec du deploy. Vérifiez DATABASE_URL et les logs ci-dessus.');
        process.exit(1);
      }
    } else {
      console.log('   Pour les appliquer : npm run migrate:deploy');
      console.log('   Ou : npm run verify-migrations -- --deploy\n');
      process.exit(1);
    }
  } else {
    console.log('   Base de données à jour (toutes les migrations sont appliquées).\n');
  }
} else {
  console.log('   Impossible de récupérer le statut (connexion DB ou Prisma).');
  console.log('   Assurez-vous que backend/.env contient DATABASE_URL.');
  console.log('   Pour appliquer les migrations : cd backend && npx prisma migrate deploy\n');
  if (doDeploy) {
    console.log('   Tentative de deploy malgré tout…\n');
    const deploy = run('npx prisma migrate deploy', BACKEND);
    if (!deploy.ok) process.exit(1);
  } else {
    process.exit(1);
  }
}

console.log('=== Vérification terminée ===\n');
