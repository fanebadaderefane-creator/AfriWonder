#!/usr/bin/env node
/**
 * Valide un export Logcat (lignes AFW_CALL / phase WebRTC).
 * Usage:
 *   adb logcat -d > call-phone-a.log
 *   node scripts/validate-afw-call-log.cjs call-phone-a.log call-phone-b.log
 */
const fs = require('fs');
const path = require('path');

const REQUIRED = [
  'turn_config',
  'pc_created',
  'sdp_send',
  'sdp_remote',
  'ice_local',
  'ice_state',
  'media_connected',
];
const FORBIDDEN = ['signal_failed', 'ice_remote_failed'];

function analyzeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const phases = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes('AFW_CALL') && !line.includes('"phase"')) continue;
    const m = line.match(/"phase"\s*:\s*"([^"]+)"/);
    if (m) phases.push(m[1]);
  }

  const unique = [...new Set(phases)];
  const missing = REQUIRED.filter((p) => !unique.includes(p));
  const forbiddenFound = FORBIDDEN.filter((p) => unique.includes(p));
  const iceFailed = /"iceConnectionState"\s*:\s*"failed"/.test(raw);
  const hasIceConnected =
    /"iceConnectionState"\s*:\s*"connected"/.test(raw)
    || /"iceConnectionState"\s*:\s*"completed"/.test(raw);
  const hasMediaConnected = unique.includes('media_connected');

  let turnConfigured = null;
  const turnMatch = raw.match(/"turnConfigured"\s*:\s*(true|false)/);
  if (turnMatch) turnConfigured = turnMatch[1] === 'true';

  return {
    file: path.basename(filePath),
    phases: unique,
    missing,
    forbiddenFound,
    iceFailed,
    hasIceConnected,
    hasMediaConnected,
    turnConfigured,
    pass:
      missing.length === 0
      && forbiddenFound.length === 0
      && !iceFailed
      && hasIceConnected
      && hasMediaConnected,
  };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node validate-afw-call-log.cjs <log1> [log2] ...');
  process.exit(1);
}

let allPass = true;
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error('Fichier introuvable:', f);
    allPass = false;
    continue;
  }
  const r = analyzeFile(f);
  console.log(`\n=== ${r.file} ===`);
  console.log('Phases:', r.phases.join(', ') || '(aucune)');
  console.log('turnConfigured:', r.turnConfigured ?? 'non détecté');
  console.log('Manquantes:', r.missing.length ? r.missing.join(', ') : 'aucune');
  console.log('Interdites:', r.forbiddenFound.length ? r.forbiddenFound.join(', ') : 'aucune');
  console.log('ice failed dans log:', r.iceFailed ? 'OUI' : 'non');
  console.log('ice connected:', r.hasIceConnected ? 'oui' : 'non');
  console.log('media_connected:', r.hasMediaConnected ? 'oui' : 'non');
  console.log('Verdict:', r.pass ? 'PASS' : 'FAIL');
  if (!r.pass) allPass = false;
}

const needTwoDevices = files.length >= 2;
console.log('\n--- Verdict global ---');
if (allPass && needTwoDevices) {
  console.log('GO — logs conformes pour candidat publication (après 8 scénarios manuels).');
  process.exit(0);
}
if (!needTwoDevices) {
  console.log('NO-GO — fournir au moins 2 fichiers log (un par téléphone).');
}
else {
  console.log('NO-GO — corriger ou refaire les appels de test.');
}
process.exit(allPass && needTwoDevices ? 0 : 1);
