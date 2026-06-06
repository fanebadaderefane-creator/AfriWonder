#!/usr/bin/env node
/**
 * Gate ciblée appels audio/vidéo — complète verify-pre-apk.
 * Vérifie invariants média bidirectionnel + prod TURN + tests call/*.
 * ⛔ Bloque les régressions signalisation — voir `.cursor/rules/call-signaling-locked.mdc`
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
  ['SafeNativeRtcView (anti-crash RTC)', /SafeNativeRtcView/],
  ['CallScreenErrorBoundary', /CallScreenErrorBoundary/],
  ['Teardown RTC différé avant close PC', /scheduleStopAllMedia|nativeRtcTeardownDelayMs/],
  ['Démontage RTCView avant média (nativeRtcUnmounting)', /nativeRtcUnmounting/],
  ['RTCView distant vidéo + remoteStreamKey', /remote-video-\$\{remoteStreamKey\}/],
  ['RTCView caché audio natif', /hiddenRemoteRtc|remote-audio-\$\{remoteStreamKey\}/],
  ['startNativeCallAudioSession', /startNativeCallAudioSession/],
  ['applyNativeCallSpeakerRoute', /applyNativeCallSpeakerRoute/],
  ['createOffer sans contrainte héritée (anti mid=1)', /createOffer\(callSdpNegotiationOptions\(\)\)/],
  ['createAnswer sans contrainte héritée (anti mid=1)', /createAnswer\(callSdpNegotiationOptions\(\)\)/],
  ['Garde section audio dupliquée (countSdpMediaSections)', /countSdpMediaSections/],
  ['call:accept après setup (receveur)', /buildCallAcceptPayload/],
  ['call:end avec reason + durationSec', /reason:\s*socketReason[\s\S]*durationSec/],
  ['TURN warning cellulaire', /turnConfigured && !isWebRuntime/],
  ['Bug #1 — clear ring timeout on accept', /clearCallerRingTimeout\(\)/],
  ['Bug #2 — pas de releaseExpoAv en connecting', /Ne pas rappeler releaseExpoAv/],
  ['Bug #3 — watchdog après accept (appelant)', /shouldArmMediaConnectionWatchdog|armMediaWatchdogIfReady/],
  ['Transceivers sendrecv avant getUserMedia', /addTransceiver\('audio'/],
  ['acquireCallLocalMedia (repli getUserMedia)', /acquireCallLocalMedia/],
  ['streamHasActiveMediaTracks (URI invalide web)', /streamHasActiveMediaTracks/],
  ['callSetupGenRef anti double bootstrap', /callSetupGenRef/],
  ['Fusion pistes distantes (mergeRemoteTrackIntoStream)', /mergeRemoteTrackIntoStream/],
  ['joinUserRoom au bootstrap appel', /joinUserRoom\(myUserId\)/],
  ['call:missed ignoré après décrochage', /shouldFinishCallAsMissed/],
  ['call:invite:ack sync callId', /call:invite:ack/],
  ['Upgrade vocal→vidéo (attachVideoToActiveCall)', /attachVideoToActiveCall/],
  ['RTCView secours audio vidéo natif', /hiddenRemoteRtcVideoBackup/],
  ['ICE restart changement réseau', /triggerIceRestartRef|ice_restart_network_change/],
  ['Foreground service appel actif', /startActiveCallForeground/],
  ['showNativeRemoteRtc (RTC distant après connected)', /showNativeRemoteRtc/],
  ['isValidNativeRtcStreamUrl', /isValidNativeRtcStreamUrl/],
  ['prepareCallSessionMemory (RAM avant WebRTC)', /prepareCallSessionMemory/],
  ['canPromoteCallToConnected (vocal + vidéo)', /canPromoteCallToConnected/],
  ['useFocusEffect stabilité appel', /useFocusEffect/],
  ['SDP sortant pickOutboundCallSdp', /pickOutboundCallSdp/],
  ['SDP sortant sendSdpFromPeerConnection', /sendSdpFromPeerConnection/],
  ['SDP entrant normalizeInboundCallSignal', /normalizeInboundCallSignal/],
  ['Signaux séquentiels enqueueSignal', /enqueueSignal/],
  ['File signaux avant PC flushPendingSignals', /flushPendingSignals/],
  ['callIdsEqual / callUserIdsEqual', /callIdsEqual[\s\S]*callUserIdsEqual/],
  ['Réémission offre appelant (sdp_resend_offer)', /shouldResendCallerOffer|sdp_resend_offer/],
  ['Log signal_rx', /signal_rx/],
  ['Log sdp_send', /sdp_send/],
  ['Log signal_drop', /signal_drop/],
];
for (const [label, re] of checks) {
  if (re.test(callTsx)) ok(label);
  else fail(label);
}

// Régression mid='1' : les contraintes héritées offerToReceive* recréent une 2e
// section audio en Unified Plan → setRemoteDescription échoue côté appelant.
if (/offerToReceive(Audio|Video):/.test(callTsx)) {
  fail("call.tsx — contrainte héritée offerToReceive* réintroduite (risque mid='1')");
} else {
  ok("Aucune contrainte héritée offerToReceive* (anti duplicat audio mid='1')");
}
const webIncoming = read('src/services/incomingCallService.web.ts');
if (/startActiveCallForeground/.test(webIncoming) && /stopActiveCallForeground/.test(webIncoming)) {
  ok('incomingCallService.web.ts — foreground no-op');
} else {
  fail('incomingCallService.web.ts — foreground no-op');
}

console.log('\n━━ Expo web — appels (frontend/, RN Web — PAS la PWA) ━━');
if (/isWebRuntime|Platform\.OS === 'web'/.test(callTsx)) {
  ok('call.tsx sert Expo web + natif (isWebRuntime / Platform.OS web)');
} else {
  fail('call.tsx : branche Expo web introuvable');
}
if (/beginWebCallMediaCapture|waitForWebMediaConsent/.test(callTsx)) {
  ok('call.tsx — consentement micro web (geste utilisateur)');
} else {
  fail('call.tsx — flux média web manquant');
}

console.log('\n━━ PWA Vite séparée — DirectCall.jsx (racine src/, hors frontend/) ━━');
const directCall = fs.existsSync(path.join(FRONTEND, '..', 'src', 'pages', 'DirectCall.jsx'))
  ? fs.readFileSync(path.join(FRONTEND, '..', 'src', 'pages', 'DirectCall.jsx'), 'utf8')
  : '';
if (directCall) {
  const pwaChecks = [
    ['normalizeInboundCallSignal', /normalizeInboundCallSignal/],
    ['pickOutboundCallSdp', /pickOutboundCallSdp/],
    ['signal kind sdp', /kind:\s*['"]sdp['"]/],
    ['signal kind ice', /kind:\s*['"]ice['"]/],
    ['accept après getUserMedia', /receiverAcceptSentRef/],
  ];
  for (const [label, re] of pwaChecks) {
    if (re.test(directCall)) ok(`PWA ${label}`);
    else fail(`PWA ${label}`);
  }
} else {
  fail('PWA DirectCall.jsx introuvable');
}

console.log('\n━━ callAcceptLifecycle (bugs audit #1 #3) ━━');
if (run('npm', ['run', 'test', '--', 'src/call/callAcceptLifecycle.test.ts'])) {
  ok('callAcceptLifecycle');
} else {
  fail('callAcceptLifecycle');
}

console.log('\n━━ callRemoteMedia (audio distant requis) ━━');
if (run('npm', ['run', 'test', '--', 'src/call/callRemoteMedia.test.ts', 'src/call/callNetworkConfig.test.ts', 'src/call/parseTurnCredentialsResponse.test.ts', 'src/call/callSignalingPayload.test.ts'])) {
  ok('Tests unitaires média / TURN / signalisation');
} else {
  fail('Tests unitaires média / TURN / signalisation');
}

console.log('\n━━ Backend prod (TURN + socket) ━━');
const prodOk = run('node', [path.join(__dirname, 'verify-call-stack-prod.cjs')], FRONTEND);
if (!prodOk) fail('verify-call-stack-prod');

console.log('\n━━ Backend incoming call push ━━');
const indexTs = fs.readFileSync(path.join(BACKEND, 'src', 'index.ts'), 'utf8');
if (/dispatchIncomingCallMobileWakePush/.test(indexTs)) ok('dispatchIncomingCallMobileWakePush sur call:invite');
else fail('dispatchIncomingCallMobileWakePush sur call:invite');
if (fs.existsSync(path.join(BACKEND, 'src', 'services', 'apnsVoipPush.service.ts'))) ok('apnsVoipPush.service.ts');
else fail('apnsVoipPush.service.ts');

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
