#!/usr/bin/env node
/**
 * Audit sécurité AfriWonder (cross-platform)
 * Usage: node scripts/security-audit.js
 * Vérifie: npm audit, .env, rate limiting, webhooks, CORS, Helmet
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

let fail = 0;

console.log('=== Audit sécurité AfriWonder ===\n');

// 0. Policy diff sécurité/qualité (secrets, localhost, console.log, TODO sans ticket)
try {
  execSync('node scripts/enforce-engineering-standards.mjs', { cwd: process.cwd(), stdio: 'inherit' });
  console.log('   ✅ Policy diff (standards ingénierie) validée');
} catch {
  console.log('   ⚠️ Policy diff: violations détectées');
  fail = 1;
}

// 1. npm audit backend
try {
  execSync('npm audit --audit-level=high', { cwd: join(process.cwd(), 'backend'), stdio: 'inherit' });
  console.log('   ✅ Backend: pas de vulnérabilités high/critical');
} catch {
  console.log('   ⚠️ Backend: vulnérabilités détectées - exécuter npm audit fix');
  fail = 1;
}

// 2. npm audit frontend (root)
try {
  execSync('npm audit --audit-level=high', { cwd: process.cwd(), stdio: 'inherit' });
  console.log('   ✅ Frontend: pas de vulnérabilités high/critical');
} catch {
  console.log('   ⚠️ Frontend: vulnérabilités détectées');
  fail = 1;
}

// 3. Vérifier .env (ne pas commiter)
const envPath = join(process.cwd(), 'backend', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  if (envContent.includes('JWT_SECRET=changeme') || /JWT_SECRET=\s*$/.test(envContent)) {
    console.log('   ⚠️ JWT_SECRET à changer en production');
    fail = 1;
  } else {
    console.log('   ✅ .env présent (ne pas commiter)');
  }
} else {
  console.log('   ℹ️ backend/.env absent (normal en dev)');
}

// 4. Rate limiting backend
const rateLimitPath = join(process.cwd(), 'backend', 'src', 'middleware', 'rateLimiting.ts');
if (existsSync(rateLimitPath)) {
  const rl = readFileSync(rateLimitPath, 'utf8');
  if (rl.includes('rateLimit') || rl.includes('rate-limiter')) {
    console.log('   ✅ Rate limiting configuré');
  }
}

// 5. Webhooks paiement (validation signature)
const paymentPath = join(process.cwd(), 'backend', 'src', 'services', 'payment.service.ts');
if (existsSync(paymentPath)) {
  const pay = readFileSync(paymentPath, 'utf8');
  if (pay.includes('verifyStripeWebhook') || pay.includes('verifyOrangeMoney') || pay.includes('verifyMoov')) {
    console.log('   ✅ Webhooks paiement validés (signature)');
  }
}

// 6. Helmet / CORS
const appPath = join(process.cwd(), 'backend', 'src', 'app.ts');
if (existsSync(appPath)) {
  const app = readFileSync(appPath, 'utf8');
  if (app.includes('helmet') || app.includes('Helmet')) console.log('   ✅ Helmet (headers sécurité)');
  if (app.includes('cors') || app.includes('CORS')) console.log('   ✅ CORS configuré');
}

// 7. WAF script
if (existsSync(join(process.cwd(), 'scripts', 'cloudflare-waf-setup.sh'))) {
  console.log('   ✅ Script WAF Cloudflare présent');
}

console.log('\nChecklist complète: docs/SECURITY_AUDIT_CHECKLIST.md');
console.log('=== Fin audit ===\n');
process.exit(fail);
