#!/usr/bin/env node
/**
 * Vérifie que les variables d'environnement production sont définies (sans afficher les valeurs).
 * Usage: node scripts/check-prod-env.js
 *        ou: npm run check:prod-env (si ajouté dans package.json)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const allowNoRedis =
  process.env.ALLOW_NO_REDIS_IN_PRODUCTION === 'true' ||
  process.env.ALLOW_NO_REDIS_IN_PRODUCTION === '1';
const renderLenientRedis =
  process.env.RENDER === 'true' &&
  process.env.FORCE_REDIS_IN_PRODUCTION !== 'true' &&
  process.env.FORCE_REDIS_IN_PRODUCTION !== '1';

const required = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CORS_ORIGIN',
  ...(allowNoRedis || renderLenientRedis ? [] : ['REDIS_URL']),
];

const recommended = [
  'SENTRY_DSN',
  'HEALTH_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ORANGE_MONEY_WEBHOOK_SECRET',
  'MOOV_MONEY_WEBHOOK_SECRET',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];

const optional = [
  'ORANGE_MONEY_CLIENT_ID',
  'ORANGE_MONEY_API_KEY',
  'ERROR_WEBHOOK_URL',
  'EXPO_ACCESS_TOKEN',
  'AGORA_APP_ID',
  'TURN_URL',
];

let failed = 0;
console.log('=== Check env production ===\n');

required.forEach((key) => {
  const ok = process.env[key] && String(process.env[key]).trim().length > 0;
  console.log(ok ? '  OK' : '  MANQUE', key);
  if (!ok) failed++;
});

const jwtA = String(process.env.JWT_SECRET || '').trim();
const jwtB = String(process.env.JWT_REFRESH_SECRET || '').trim();
if (jwtA.length < 64 || jwtB.length < 64 || jwtA === jwtB) {
  console.log('  MANQUE', 'JWT fort (64+ caractères chacun, deux secrets différents)');
  failed++;
}

if (allowNoRedis || renderLenientRedis) {
  const redis = process.env.REDIS_URL && String(process.env.REDIS_URL).trim().length > 0;
  const tag = allowNoRedis ? 'ALLOW_NO_REDIS_IN_PRODUCTION' : 'RENDER (tolérance sans Redis)';
  console.log(redis ? '  OK' : '  (levée)', 'REDIS_URL', `(${tag} — instance unique / une dyno)`);
}

console.log('\n--- Recommandé ---');
recommended.forEach((key) => {
  const ok = process.env[key] && String(process.env[key]).trim().length > 0;
  console.log(ok ? '  OK' : '  (optionnel)', key);
});

if (failed > 0) {
  console.log('\n>>> Erreur:', failed, 'variable(s) obligatoire(s) manquante(s). Ne pas lancer en prod.\n');
  process.exit(1);
}

console.log('\n>>> Toutes les variables obligatoires sont définies.\n');
process.exit(0);
