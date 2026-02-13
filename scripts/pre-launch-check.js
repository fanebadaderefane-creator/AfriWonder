#!/usr/bin/env node
/**
 * Vérification pré-lancement production AfriWonder
 * Exécute toutes les vérifications automatisables avant le déploiement.
 * Usage: node scripts/pre-launch-check.js
 *        npm run pre-launch-check (racine)
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKEND = join(ROOT, 'backend');

const results = { ok: [], fail: [], warn: [] };

function run(cmd, cwd = ROOT, desc = cmd) {
  const [bin, ...args] = cmd.split(/\s+/);
  const r = spawnSync(bin, args, { cwd, stdio: 'pipe', shell: true });
  return { ok: r.status === 0, desc, stdout: r.stdout?.toString(), stderr: r.stderr?.toString() };
}

function log(emoji, msg) {
  console.log(`  ${emoji} ${msg}`);
}

console.log('\n=== Vérification pré-lancement AfriWonder ===\n');

// 1. Env production
console.log('1. Variables d\'environnement (backend/.env)');
const envPath = join(BACKEND, '.env');
if (!existsSync(envPath)) {
  results.fail.push('backend/.env manquant');
  log('❌', 'backend/.env manquant — copier env.production.template');
} else {
  const envCheck = run('node scripts/check-prod-env.js', BACKEND, 'check-prod-env');
  if (envCheck.ok) {
    results.ok.push('Variables .env obligatoires');
    log('✅', 'Variables .env obligatoires OK');
  } else {
    results.fail.push('Variables .env manquantes ou incomplètes');
    log('❌', 'Variables manquantes — cd backend && npm run check:prod-env');
  }
}

// 2. Build backend
console.log('\n2. Build backend');
const buildBackend = run('npm run build', BACKEND, 'build');
if (buildBackend.ok) {
  results.ok.push('Build backend');
  log('✅', 'Build backend OK');
} else {
  results.fail.push('Build backend échoué');
  log('❌', 'Build backend échoué');
  if (buildBackend.stderr) console.log(buildBackend.stderr.slice(0, 500));
}

// 3. Build frontend
console.log('\n3. Build frontend');
const buildFrontend = run('npm run build', ROOT, 'build frontend');
if (buildFrontend.ok) {
  results.ok.push('Build frontend');
  log('✅', 'Build frontend OK');
} else {
  results.fail.push('Build frontend échoué');
  log('❌', 'Build frontend échoué');
  if (buildFrontend.stderr) console.log(buildFrontend.stderr.slice(0, 500));
}

// 4. Migrations (dry-run: vérifier que prisma est OK)
console.log('\n4. Prisma / migrations');
const prismaGen = run('npx prisma generate', BACKEND, 'prisma generate');
if (prismaGen.ok) {
  results.ok.push('Prisma generate');
  log('✅', 'Prisma generate OK');
} else {
  results.fail.push('Prisma generate échoué');
  log('❌', 'Prisma generate échoué');
}

// 5. Tests backend (smoke uniquement pour rapidité)
console.log('\n5. Tests backend (smoke)');
const testBackend = run('npm run test:smoke --prefix backend', ROOT, 'test smoke');
if (testBackend.ok) {
  results.ok.push('Tests backend smoke');
  log('✅', 'Tests smoke OK');
} else {
  results.warn.push('Tests smoke échoués (vérifier DATABASE_URL test)');
  log('⚠️', 'Tests smoke échoués — vérifier .env.test et DB test');
}

// 6. Fichiers critiques
console.log('\n6. Fichiers critiques');
const criticalFiles = [
  [join(BACKEND, 'ecosystem.config.js'), 'PM2 ecosystem'],
  [join(ROOT, 'nginx-production.conf'), 'Nginx config'],
  [join(BACKEND, 'scripts', 'setup-cron-backup.sh'), 'Script cron backup'],
  [join(BACKEND, 'scripts', 'cron-backup-3x-daily.sh'), 'Cron backup 3x/jour'],
];
criticalFiles.forEach(([p, name]) => {
  if (existsSync(p)) {
    results.ok.push(name);
    log('✅', name);
  } else {
    results.fail.push(`${name} manquant`);
    log('❌', `${name} manquant`);
  }
});

// 7. .gitignore contient .env
const gitignore = join(ROOT, '.gitignore');
if (existsSync(gitignore)) {
  const content = readFileSync(gitignore, 'utf8');
  if (content.includes('.env') && !content.includes('!.env.example')) {
    log('✅', '.env dans .gitignore (sécurité)');
  } else {
    log('⚠️', 'Vérifier que .env n\'est pas versionné');
  }
}

// Résumé
console.log('\n--- RÉSUMÉ ---');
console.log(`  ✅ OK: ${results.ok.length}`);
console.log(`  ❌ Échecs: ${results.fail.length}`);
console.log(`  ⚠️ Avertissements: ${results.warn.length}`);

if (results.fail.length > 0) {
  console.log('\n>>> ÉCHECS À CORRIGER:');
  results.fail.forEach((f) => console.log('   -', f));
}

if (results.warn.length > 0) {
  console.log('\n>>> À VÉRIFIER:');
  results.warn.forEach((w) => console.log('   -', w));
}

console.log('\n>>> Actions manuelles: voir TODO_MANUEL_USER.md\n');

process.exit(results.fail.length > 0 ? 1 : 0);
