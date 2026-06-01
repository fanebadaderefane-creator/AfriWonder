#!/usr/bin/env node
/**
 * Gate ciblée appels audio/vidéo — complète verify-pre-apk.
 * Vérifie invariants média bidirectionnel + prod TURN + tests call/*.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND = path.resolve(__dirname, '..');
const BACKEND = path.resolve(FRONTEND, '..', 'backend');
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

function run(cmd, args, cwd = FRONTEND) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  return r.status === 0;
}

console.log('\n🎧 Vérification appels audio/vidéo bidirectionnels\n');

console.log('━━ Invariants call.tsx ━━');
const callTsx = read('app/messages/call.tsx');
const checks = [
  ['parseTurnCredentialsResponse', /parseTurnCredentialsResponse/],
  ['shouldMarkCallConnected (audio avant chrono)', /shouldMarkCallConnected/],
  ['streamHasLiveAudio', /streamHasLiveAudio/],
  ['RTCView distant vidéo + remoteStreamKey', /remote-video-\$\{remoteStreamKey\}/],
  ['RTCView caché audio natif', /hiddenRemoteRtc|remote-audio-\$\{remoteStreamKey\}/],
  ['startNativeCallAudioSession', /startNativeCallAudioSession/],
  ['applyNativeCallSpeakerRoute', /applyNativeCallSpeakerRoute/],
  ['offerToReceiveAudio', /offerToReceiveAudio:\s*true/],
  ['offerToReceiveVideo (vidéo)', /offerToReceiveVideo:\s*isVideo/],
  ['call:accept après setup (receveur)', /buildCallAcceptPayload/],
  ['call:end avec reason + durationSec', /reason:\s*socketReason[\s\S]*durationSec/],
  ['TURN warning cellulaire', /turnConfigured && !isWebRuntime/],
];
for (const [label, re] of checks) {
  if (re.test(callTsx)) ok(label);
  else fail(label);
}

console.log('\n━━ callRemoteMedia (audio distant requis) ━━');
if (run('npm', ['run', 'test', '--', 'src/call/callRemoteMedia.test.ts', 'src/call/callNetworkConfig.test.ts', 'src/call/parseTurnCredentialsResponse.test.ts', 'src/call/callNativeMedia.test.ts', 'src/call/callSignalingPayload.test.ts'])) {
  ok('Tests unitaires média / TURN / signalisation');
} else {
  fail('Tests unitaires média / TURN / signalisation');
}

console.log('\n━━ Backend prod (TURN + socket) ━━');
const prodOk = run('node', [path.join(__dirname, 'verify-call-stack-prod.cjs')], FRONTEND);
if (!prodOk) fail('verify-call-stack-prod');

console.log('\n━━ Typecheck call stack ━━');
if (run('npm', ['run', 'typecheck'])) ok('tsc --noEmit');
else fail('tsc --noEmit');

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  Échecs: ${failures.length}`);
if (failures.length) {
  console.log('\n  Bloquants:');
  for (const f of failures) console.log(`    • ${f}`);
}
console.log('\n  ⚠️  100 % audio/vidéo A↔B exige test manuel 2 appareils (WiFi puis 4G).');
console.log('      Expo Go ne supporte pas WebRTC natif — build EAS preview obligatoire.');
console.log('══════════════════════════════════════════\n');

process.exit(failures.length ? 1 : 0);
