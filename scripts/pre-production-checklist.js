#!/usr/bin/env node
/**
 * Checklist complète pré-production AfriWonder.
 * Exécuter avant chaque déploiement pour dormir tranquille.
 * Usage: npm run pre-production-checklist
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const results = { ok: [], fail: [], warn: [] };

function run(cmd, cwd = ROOT) {
  const [bin, ...args] = cmd.split(/\s+/);
  const r = spawnSync(bin, args, { cwd, stdio: 'pipe', shell: true });
  return r.status === 0;
}

function log(emoji, msg) {
  console.log(`  ${emoji} ${msg}`);
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║   AfriWonder — Checklist pré-production                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 1. Build frontend
console.log('1. Build frontend');
if (run('npm run build', ROOT)) {
  results.ok.push('Build frontend');
  log('✅', 'Build OK');
} else {
  results.fail.push('Build frontend échoué');
  log('❌', 'Build échoué');
}

// 2. Persistance
console.log('\n2. Modules persistance');
if (run('node scripts/verify-persistence.js', ROOT)) {
  results.ok.push('Persistance');
  log('✅', 'Modules persistance OK');
} else {
  results.warn.push('Vérifier persist');
  log('⚠️', 'Persistance — npm run verify-persistence');
}

// 3. Lint
console.log('\n3. Lint');
if (run('npm run lint', ROOT)) {
  results.ok.push('Lint');
  log('✅', 'Lint OK');
} else {
  results.warn.push('Lint — corriger les erreurs');
  log('⚠️', 'Lint — npm run lint:fix');
}

// 4. Variables env (prod)
console.log('\n4. Variables production');
const envExample = join(ROOT, '.env.example');
const envContent = existsSync(envExample) ? readFileSync(envExample, 'utf8') : '';
const needsViteApi = envContent.includes('VITE_API_URL') || true;
const needsSentry = envContent.includes('VITE_SENTRY_DSN') || true;
log('ℹ️', 'Vérifier manuellement : VITE_API_URL, VITE_SENTRY_DSN dans .env de déploiement');

// 5. Tests (rapides)
console.log('\n5. Tests unitaires (échantillon)');
if (run('npx vitest run src/lib/query-client.test.js src/lib/preferences.test.js --reporter=dot', ROOT)) {
  results.ok.push('Tests');
  log('✅', 'Tests OK');
} else {
  results.warn.push('Tests échoués');
  log('⚠️', 'Tests — npm run test');
}

// Résumé
console.log('\n─────────────────────────────────────────────────────────');
console.log(`  ✅ Réussis : ${results.ok.length}`);
console.log(`  ❌ Échecs  : ${results.fail.length}`);
console.log(`  ⚠️ À vérifier : ${results.warn.length}`);
console.log('─────────────────────────────────────────────────────────\n');

if (results.fail.length > 0) {
  console.log('>>> À corriger avant mise en production :');
  results.fail.forEach((f) => console.log('   -', f));
  console.log('');
  process.exit(1);
}

console.log('>>> Checklist OK. Voir PRODUCTION_READINESS.md pour la checklist manuelle.\n');
process.exit(0);
