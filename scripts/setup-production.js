#!/usr/bin/env node
/**
 * Setup production AfriWonder — Automatise les étapes possibles
 * Usage: node scripts/setup-production.js
 *        npm run setup-production
 *
 * Ce script NE PEUT PAS : configurer .env (valeurs sensibles), SSL, contrats paiement.
 * Voir TODO_MANUEL_USER.md pour les actions manuelles.
 */
import { spawnSync } from 'child_process';
import { existsSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BACKEND = join(ROOT, 'backend');

function run(cmd, cwd = ROOT) {
  const [bin, ...args] = cmd.split(/\s+/);
  return spawnSync(bin, args, { cwd, stdio: 'inherit', shell: true });
}

function step(msg) {
  console.log('\n>>>', msg);
}

console.log('\n=== Setup Production AfriWonder ===\n');

// 1. Vérifier / créer .env depuis template
step('1. Fichier .env');
const envPath = join(BACKEND, '.env');
const templatePath = join(ROOT, 'env.production.template');
if (!existsSync(envPath)) {
  if (existsSync(templatePath)) {
    copyFileSync(templatePath, envPath);
    console.log('   Copié env.production.template -> backend/.env');
    console.log('   IMPORTANT: Éditer backend/.env et remplir toutes les valeurs !');
  } else {
    console.log('   ERREUR: env.production.template introuvable');
    process.exit(1);
  }
} else {
  console.log('   backend/.env existe déjà');
}

// 2. Générer JWT si vide (optionnel)
step('2. JWT secrets (vérification)');
try {
  const envContent = readFileSync(envPath, 'utf8');
  const needsJwt = envContent.includes('GENERER_64') || envContent.includes('your-jwt-secret');
  if (needsJwt) {
    const secret = require('crypto').randomBytes(32).toString('hex');
    const refresh = require('crypto').randomBytes(32).toString('hex');
    console.log('   Génération de secrets (à copier dans .env):');
    console.log('   JWT_SECRET=' + secret);
    console.log('   JWT_REFRESH_SECRET=' + refresh);
    console.log('   (Ne pas commiter ces valeurs !)');
  } else {
    console.log('   JWT semble configuré');
  }
} catch (e) {
  console.log('   (skip)');
}

// 3. Prisma generate
step('3. Prisma generate');
if (run('npx prisma generate', BACKEND).status !== 0) {
  console.log('   Échec prisma generate');
  process.exit(1);
}
console.log('   OK');

// 4. Build backend
step('4. Build backend');
if (run('npm run build', BACKEND).status !== 0) {
  console.log('   Échec build backend');
  process.exit(1);
}
console.log('   OK');

// 5. Build frontend
step('5. Build frontend');
if (run('npm run build', ROOT).status !== 0) {
  console.log('   Échec build frontend');
  process.exit(1);
}
console.log('   OK');

// 6. Créer dossiers logs
step('6. Dossiers logs');
const logsDir = join(BACKEND, 'logs');
const backupsDir = join(BACKEND, 'backups');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
  console.log('   Créé backend/logs');
}
if (!existsSync(backupsDir)) {
  mkdirSync(backupsDir, { recursive: true });
  console.log('   Créé backend/backups');
}
console.log('   OK');

// 7. Migrations (nécessite DATABASE_URL valide)
step('7. Migrations base de données');
const migrate = run('npx prisma migrate deploy', BACKEND);
if (migrate.status !== 0) {
  console.log('   Échec migrations — vérifier DATABASE_URL dans .env');
  console.log('   Commande manuelle: cd backend && npx prisma migrate deploy');
} else {
  console.log('   OK');
}

// 8. Scripts backup
step('8. Scripts backup');
const setupCron = join(BACKEND, 'scripts', 'setup-cron-backup.sh');
if (existsSync(setupCron)) {
  console.log('   setup-cron-backup.sh présent');
}
console.log('   Sur serveur Linux: chmod +x puis sudo ./backend/scripts/setup-cron-backup.sh');

console.log('\n=== Setup terminé ===\n');
console.log('PROCHAINES ÉTAPES (manuelles):');
console.log('  1. Éditer backend/.env — remplir toutes les variables');
console.log('  2. cd backend && npm run check:prod-env');
console.log('  3. pm2 start ecosystem.config.js');
console.log('  4. Configurer Nginx (voir nginx-production.conf)');
console.log('  5. Installer cron backup: sudo ./backend/scripts/setup-cron-backup.sh');
console.log('\nVoir TODO_MANUEL_USER.md pour la liste complète.\n');
