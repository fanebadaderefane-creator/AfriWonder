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

const required = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'REDIS_URL',
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
];

let failed = 0;
console.log('=== Check env production ===\n');

required.forEach((key) => {
  const ok = process.env[key] && String(process.env[key]).trim().length > 0;
  console.log(ok ? '  OK' : '  MANQUE', key);
  if (!ok) failed++;
});

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
