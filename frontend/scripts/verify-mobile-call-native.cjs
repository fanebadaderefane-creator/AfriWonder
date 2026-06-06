#!/usr/bin/env node
/**
 * Audit ciblé appels vocal/vidéo — Android & iOS uniquement (pas le web).
 * Complète verify-pre-apk et verify-call-media-readiness.
 * ⛔ Bloque les régressions signalisation — voir `.cursor/rules/call-signaling-locked.mdc`
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: FRONTEND,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

console.log('\n📱 Audit appels natifs — Android & iOS\n');

const appJson = JSON.parse(read('app.json'));
const androidPerms = appJson.expo?.android?.permissions || [];
const iosModes = appJson.expo?.ios?.infoPlist?.UIBackgroundModes || [];

console.log('━━ Manifeste Android ━━');
for (const p of [
  'RECORD_AUDIO',
  'CAMERA',
  'MODIFY_AUDIO_SETTINGS',
  'FOREGROUND_SERVICE_PHONE_CALL',
  'FOREGROUND_SERVICE_MICROPHONE',
  'FOREGROUND_SERVICE_CAMERA',
  'USE_FULL_SCREEN_INTENT',
  'POST_NOTIFICATIONS',
]) {
  if (androidPerms.includes(p)) ok(`permission ${p}`);
  else fail(`permission Android manquante: ${p}`);
}

console.log('\n━━ Manifeste iOS ━━');
for (const m of ['audio', 'voip']) {
  if (iosModes.includes(m)) ok(`UIBackgroundModes ${m}`);
  else fail(`UIBackgroundModes manquant: ${m}`);
}
const mic = String(appJson.expo?.ios?.infoPlist?.NSMicrophoneUsageDescription || '');
const cam = String(appJson.expo?.ios?.infoPlist?.NSCameraUsageDescription || '');
if (/appel|audio/i.test(mic)) ok('NSMicrophoneUsageDescription (appels)');
else fail('NSMicrophoneUsageDescription ne mentionne pas les appels');
if (/vidéo|video|appel/i.test(cam)) ok('NSCameraUsageDescription (vidéo/appels)');
else fail('NSCameraUsageDescription ne mentionne pas vidéo/appels');

console.log('\n━━ Modules natifs WebRTC ━━');
const pkg = JSON.parse(read('package.json'));
for (const dep of [
  'react-native-webrtc',
  'react-native-incall-manager',
  'react-native-voip-push-notification',
  'react-native-callkeep',
  '@notifee/react-native',
]) {
  if (pkg.dependencies?.[dep]) ok(`${dep}`);
  else fail(`dépendance manquante: ${dep}`);
}

const webrtcLoader = read('src/call/tryLoadReactNativeWebRtc.ts');
if (/WebRTCModule/.test(webrtcLoader) && /isNativeWebRtcAvailable/.test(webrtcLoader)) {
  ok('Détection WebRTCModule (refuse Expo Go)');
} else {
  fail('tryLoadReactNativeWebRtc — garde Expo Go incomplète');
}

console.log('\n━━ Parcours natif call.tsx ━━');
const callTsx = read('app/messages/call.tsx');
const nativeChecks = [
  ['InCallManager / session audio', /startNativeCallAudioSession/],
  ['Permissions Android RECORD_AUDIO', /requestNativeCallPermissions/],
  ['releaseExpoAv avant WebRTC', /releaseExpoAvForWebRtcCall/],
  ['TURN relay mobile', /buildCallIceConfig/],
  ['Transceiver audio sendrecv', /addTransceiver\('audio'/],
  ['Transceiver vidéo sendrecv', /addTransceiver\('video'/],
  ['SafeNativeRtcView distant', /showNativeRemoteRtc[\s\S]*SafeNativeRtcView/],
  ['RTC audio caché (vocal)', /hiddenRemoteRtc/],
  ['RTC secours audio (vidéo)', /hiddenRemoteRtcVideoBackup/],
  ['zOrder Android vidéo', /zOrderMediaOverlay.*android/],
  ['Exclure pistes locales du distant', /isTrackFromLocalCapture/],
  ['prepareCallSessionMemory', /prepareCallSessionMemory/],
  ['SDP pickOutboundCallSdp (web + natif)', /pickOutboundCallSdp/],
  ['SDP sendSdpFromPeerConnection', /sendSdpFromPeerConnection/],
  ['normalizeInboundCallSignal', /normalizeInboundCallSignal/],
  ['enqueueSignal (ordre signaux)', /enqueueSignal/],
  ['flushPendingSignals', /flushPendingSignals/],
  ['Réémission offre perdue', /shouldResendCallerOffer|sdp_resend_offer/],
  ['ICE natif RTCIceCandidateImpl', /RTCIceCandidateImpl/],
  ['Teardown RTC différé (crash Android)', /scheduleStopAllMedia|nativeRtcTeardownDelayMs/],
  ['Démontage RTC avant fermeture PC', /nativeRtcUnmounting|setNativeRtcUnmounting/],
  ['Garde URL RTC pendant teardown', /shouldBlockNativeRtcUrlUpdate|shouldApplyNativeRtcUrl/],
  ['CallScreenErrorBoundary', /CallScreenErrorBoundary/],
];
for (const [label, re] of nativeChecks) {
  if (re.test(callTsx)) ok(label);
  else fail(label);
}

console.log('\n━━ Entrants natifs ━━');
const incoming = read('src/services/incomingCallService.ts');
if (/FOREGROUND_SERVICE_PHONE_CALL/.test(incoming) || /AndroidForegroundServiceType/.test(incoming)) {
  ok('Android foreground service appel actif');
} else {
  fail('Android foreground service appel');
}
const voip = read('src/services/voipPushService.ts');
if (/Platform\.OS !== 'ios'/.test(voip) && /displayIncomingCall/.test(voip)) {
  ok('iOS VoIP push → CallKit / displayIncomingCall');
} else {
  fail('voipPushService iOS');
}
const overlay = read('src/components/call/IncomingCallOverlay.native.tsx');
if (!/ensureConnectedEmit\s*\(\s*['"]call:accept['"]/.test(overlay)) {
  ok('Overlay n’émet pas call:accept avant PC (fix silence)');
} else {
  fail('IncomingCallOverlay émet call:accept trop tôt');
}
if (/navigateToReceiverCallScreen/.test(overlay)) {
  ok('Overlay → navigateToReceiverCallScreen (mémoire + params unifiés)');
} else {
  fail('IncomingCallOverlay doit utiliser navigateToReceiverCallScreen');
}
const incomingSvc = read('src/services/incomingCallService.ts');
if (/navigateToReceiverCallScreen/.test(incomingSvc)) {
  ok('CallKit / Notifee → navigateToReceiverCallScreen');
} else {
  fail('incomingCallService doit utiliser navigateToReceiverCallScreen');
}

console.log('\n━━ Tests unitaires natifs ━━');
const testsOk = run('npm', [
  'run',
  'test',
  '--',
  'src/call/callRemoteMedia.test.ts',
  'src/call/callNetworkConfig.test.ts',
  'src/call/callSessionStability.test.ts',
  'src/call/callNativeTeardown.test.ts',
  'src/call/callRtcStreamUrl.test.ts',
  'src/call/openNativeCallScreen.test.ts',
  'src/call/callAcceptLifecycle.test.ts',
  'src/call/callSignalingPayload.test.ts',
]);
if (testsOk) ok('Tests Vitest call/*');
else fail('Tests Vitest call/*');

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  Échecs: ${failures.length}`);
console.log('\n  Test terrain obligatoire : 2 APK EAS (Android + iOS), vocal puis vidéo, Wi‑Fi puis 4G.');
console.log('  Expo Go = pas d’appel natif (WebRTCModule absent).');
console.log('══════════════════════════════════════════\n');

process.exit(failures.length ? 1 : 0);
