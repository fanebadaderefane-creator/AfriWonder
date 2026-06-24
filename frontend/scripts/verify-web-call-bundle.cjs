#!/usr/bin/env node
/**
 * Gate statique — le bundle Expo web ne doit jamais importer react-native-agora.
 * Régression juin 2026 : Metro tirait Agora via DirectCallAgoraScreen sans suffixe .web.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND = path.resolve(__dirname, '..');
const failures = [];
const passes = [];

function ok(d) {
  passes.push(d);
  console.log(`  ✅ ${d}`);
}
function fail(d) {
  failures.push(d);
  console.error(`  ❌ ${d}`);
}

function read(rel) {
  return fs.readFileSync(path.join(FRONTEND, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(FRONTEND, rel));
}

function noAgoraImport(label, rel) {
  const src = read(rel);
  if (/from\s+['"]react-native-agora['"]|require\(['"]react-native-agora['"]\)/.test(src)) {
    fail(`${label} — import direct react-native-agora interdit (${rel})`);
    return false;
  }
  ok(`${label} — pas d'import react-native-agora (${rel})`);
  return true;
}

console.log('\n🌐 Vérification bundle web — isolation Agora\n');

const requiredPairs = [
  ['src/call/DirectCallAgoraScreen.native.tsx', 'src/call/DirectCallAgoraScreen.web.tsx'],
  ['src/call/agoraScreenShare.native.ts', 'src/call/agoraScreenShare.web.ts'],
  ['src/hooks/useDirectCallAgoraRtc.native.tsx', 'src/hooks/useDirectCallAgoraRtc.web.tsx'],
  ['src/components/call/IncomingCallOverlay.native.tsx', 'src/components/call/IncomingCallOverlay.web.tsx'],
];

for (const [nativeRel, webRel] of requiredPairs) {
  if (exists(nativeRel) && exists(webRel)) {
    ok(`Paire plateforme ${path.basename(nativeRel)} / ${path.basename(webRel)}`);
  } else {
    fail(`Paire plateforme manquante : ${nativeRel} + ${webRel}`);
  }
}

noAgoraImport('DirectCallAgoraScreen.web', 'src/call/DirectCallAgoraScreen.web.tsx');
noAgoraImport('useDirectCallAgoraRtc.web', 'src/hooks/useDirectCallAgoraRtc.web.tsx');
noAgoraImport('agoraScreenShare.web', 'src/call/agoraScreenShare.web.ts');
noAgoraImport('Barrel DirectCallAgoraScreen.tsx', 'src/call/DirectCallAgoraScreen.tsx');
noAgoraImport('Barrel agoraScreenShare.ts', 'src/call/agoraScreenShare.ts');

if (exists('src/hooks/useDirectCallAgoraRtc.ts')) {
  fail('useDirectCallAgoraRtc.ts présent — risque résolution Metro web → natif');
} else {
  ok('Pas de barrel useDirectCallAgoraRtc.ts');
}

if (exists('src/call/agoraDmForceHangup.ts')) {
  fail('agoraDmForceHangup.ts présent — réexporte .native et casse Expo web');
} else {
  ok('Pas de barrel agoraDmForceHangup.ts');
}

if (exists('src/call/agoraDmForceHangup.web.ts') && exists('src/call/agoraDmForceHangup.native.ts')) {
  ok('Paire agoraDmForceHangup.web / .native');
} else {
  fail('agoraDmForceHangup — paire .web/.native manquante');
}

noAgoraImport('agoraDmForceHangup.web', 'src/call/agoraDmForceHangup.web.ts');

const errorBoundary = read('src/components/call/CallScreenErrorBoundary.tsx');
if (/from\s+['"].*agoraDmForceHangup['"]/.test(errorBoundary)) {
  ok('CallScreenErrorBoundary — import agoraDmForceHangup (résolution .web)');
} else {
  fail('CallScreenErrorBoundary — import agoraDmForceHangup manquant');
}

const webStub = read('src/call/DirectCallAgoraScreen.web.tsx');
if (/return null/.test(webStub)) {
  ok('DirectCallAgoraScreen.web — stub return null');
} else {
  fail('DirectCallAgoraScreen.web — doit retourner null');
}

const callTsx = read('app/messages/call.tsx');
if (/Platform\.OS !== 'web'[\s\S]*shouldUseAgoraDmCalls[\s\S]*DirectCallAgoraScreen/.test(callTsx)) {
  ok('call.tsx — Agora uniquement natif (Platform + shouldUseAgoraDmCalls)');
} else {
  fail('call.tsx — branche Agora natif absente ou incorrecte');
}

const engine = read('src/call/dmCallMediaEngine.ts');
if (/Platform\.OS === 'web'[\s\S]*return false/.test(engine)) {
  ok('dmCallMediaEngine — web force false');
} else {
  fail('dmCallMediaEngine — garde web manquante');
}

const agoraRule = path.join(FRONTEND, '..', '.cursor', 'rules', 'call-dm-agora-locked.mdc');
if (fs.existsSync(agoraRule)) {
  ok('Règle Cursor call-dm-agora-locked.mdc présente');
} else {
  fail('Règle Cursor call-dm-agora-locked.mdc manquante');
}

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  Échecs: ${failures.length}`);
console.log('══════════════════════════════════════════\n');

process.exit(failures.length > 0 ? 1 : 0);
