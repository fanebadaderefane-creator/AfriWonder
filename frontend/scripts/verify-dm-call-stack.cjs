#!/usr/bin/env node
/**
 * Gate unifiée appels DM vocal + vidéo — anti-régression Mali / Maroc / web.
 *
 * Enchaîne :
 *   1. verify-web-call-bundle.cjs   (Agora hors bundle web)
 *   2. verify-call-media-readiness.cjs (invariants WebRTC + Agora)
 *   3. verify-mobile-call-native.cjs   (Android/iOS manifeste + natif)
 *   4. verify-agora-dm.cjs             (prod Agora + tests unitaires)
 *
 * Usage:
 *   cd frontend && npm run verify:dm-calls
 *   SKIP_AGORA_PROD=1 npm run verify:dm-calls   # sans fetch Render
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND = path.resolve(__dirname, '..');
const steps = [
  { name: 'Bundle web (isolation Agora)', script: 'verify-web-call-bundle.cjs' },
  { name: 'Média + signalisation', script: 'verify-call-media-readiness.cjs' },
  { name: 'Natif Android/iOS', script: 'verify-mobile-call-native.cjs' },
];

if (process.env.SKIP_AGORA_PROD !== '1') {
  steps.push({ name: 'Agora DM + prod', script: 'verify-agora-dm.cjs' });
} else {
  console.warn('\n⚠️  SKIP_AGORA_PROD=1 — verify-agora-dm ignoré\n');
}

console.log('\n📞 Gate unifiée — appels DM vocal + vidéo AfriWonder\n');

const failed = [];

for (const step of steps) {
  console.log(`\n▶ ${step.name} (${step.script})\n`);
  const r = spawnSync('node', [path.join(__dirname, step.script)], {
    cwd: FRONTEND,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  if (r.status !== 0) {
    failed.push(step.name);
  }
}

console.log('\n══════════════════════════════════════════');
console.log('  RÉSUMÉ verify:dm-calls');
console.log('══════════════════════════════════════════');
if (failed.length === 0) {
  console.log('  ✅ Toutes les gates appels DM sont vertes.');
  console.log('\n  📱 Preuve finale (obligatoire) : 2 APK + vocal puis vidéo');
  console.log('     Mali↔Mali, Maroc↔Maroc, Mali↔Maroc — Wi‑Fi puis 4G.');
} else {
  console.log(`  ❌ Échecs : ${failed.join(', ')}`);
}
console.log('══════════════════════════════════════════\n');

process.exit(failed.length > 0 ? 1 : 0);
