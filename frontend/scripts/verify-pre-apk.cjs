#!/usr/bin/env node
/**
 * Gate de livraison AVANT build APK/IPA EAS.
 * Couvre : appels (TURN, socket, signalisation), DM (upload, persistance), natif (WebRTC, permissions).
 *
 * Usage:
 *   cd frontend && npm run verify:pre-apk
 *
 * Optionnel — turnConfigured avec ton compte :
 *   AFW_TEST_EMAIL=... AFW_TEST_PASSWORD=... npm run verify:pre-apk
 *
 * Skip typecheck (plus rapide) :
 *   SKIP_PREAPK_TYPECHECK=1 npm run verify:pre-apk
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || 'https://afriwonder.onrender.com').replace(/\/+$/, '');

const failures = [];
const passes = [];
const warnings = [];

function pass(section, detail) {
  passes.push({ section, detail });
  console.log(`  ✅ ${detail}`);
}

function fail(section, detail) {
  failures.push({ section, detail });
  console.error(`  ❌ ${detail}`);
}

function warn(section, detail) {
  warnings.push({ section, detail });
  console.warn(`  ⚠️  ${detail}`);
}

function read(rel) {
  return fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(FRONTEND_ROOT, rel));
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: FRONTEND_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...opts.env },
  });
  return r.status === 0;
}

function section(title) {
  console.log(`\n━━ ${title} ━━`);
}

function checkStaticManifest() {
  section('1/6 Manifeste natif (app.json / eas.json)');

  const appJson = JSON.parse(read('app.json'));
  const androidPerms = appJson.expo?.android?.permissions || [];
  const requiredAndroid = [
    'RECORD_AUDIO',
    'CAMERA',
    'POST_NOTIFICATIONS',
    'USE_FULL_SCREEN_INTENT',
    'FOREGROUND_SERVICE_PHONE_CALL',
    'MODIFY_AUDIO_SETTINGS',
  ];
  for (const p of requiredAndroid) {
    if (androidPerms.includes(p)) pass('manifest', `Android permission ${p}`);
    else fail('manifest', `Android permission manquante: ${p}`);
  }

  const bgModes = appJson.expo?.ios?.infoPlist?.UIBackgroundModes || [];
  for (const m of ['audio', 'voip']) {
    if (bgModes.includes(m)) pass('manifest', `iOS UIBackgroundModes ${m}`);
    else fail('manifest', `iOS UIBackgroundModes manquant: ${m}`);
  }

  const micDesc = String(appJson.expo?.ios?.infoPlist?.NSMicrophoneUsageDescription || '');
  if (/appel|call|audio/i.test(micDesc)) pass('manifest', 'iOS NSMicrophoneUsageDescription mentionne les appels');
  else warn('manifest', 'iOS NSMicrophoneUsageDescription ne mentionne pas explicitement les appels');

  const eas = JSON.parse(read('eas.json'));
  for (const profile of ['preview', 'production']) {
    const url = eas.build?.[profile]?.env?.EXPO_PUBLIC_BACKEND_URL;
    if (url && /^https:\/\//.test(url)) pass('manifest', `EAS ${profile}: EXPO_PUBLIC_BACKEND_URL=${url}`);
    else fail('manifest', `EAS ${profile}: EXPO_PUBLIC_BACKEND_URL HTTPS manquant`);
  }

  const { ACTIVE_EAS_ORG, BLOCKED_PROJECT_IDS } = require('./easOrgPolicy.cjs');

  const owner = appJson.expo?.owner;
  const pid = appJson.expo?.extra?.eas?.projectId;
  const slug = appJson.expo?.slug;
  if (owner === ACTIVE_EAS_ORG.owner) pass('manifest', `EAS owner = ${ACTIVE_EAS_ORG.owner}`);
  else fail('manifest', `EAS owner = "${owner || ''}" (attendu ${ACTIVE_EAS_ORG.owner})`);
  if (slug === ACTIVE_EAS_ORG.slug) pass('manifest', `EAS slug = ${ACTIVE_EAS_ORG.slug}`);
  else fail('manifest', `EAS slug = "${slug || ''}"`);
  if (!pid) {
    fail('manifest', 'EAS projectId manquant — eas init --non-interactive --force puis sync-eas-project-env');
  } else if (BLOCKED_PROJECT_IDS.includes(pid)) {
    fail('manifest', `EAS projectId = "${pid}" (ancien org — eas init --force)`);
  } else {
    pass('manifest', `EAS projectId = ${pid}`);
  }
}

function checkStaticModulesAndFiles() {
  section('2/6 Modules natifs & fichiers critiques');

  const pkg = JSON.parse(read('package.json'));
  for (const dep of [
    'react-native-webrtc',
    'react-native-incall-manager',
    '@notifee/react-native',
    'react-native-callkeep',
  ]) {
    if (pkg.dependencies?.[dep]) pass('deps', `${dep}@${pkg.dependencies[dep]}`);
    else fail('deps', `Dépendance manquante: ${dep}`);
  }

  const criticalFiles = [
    'src/call/tryLoadReactNativeWebRtc.ts',
    'src/call/callNativeMedia.ts',
    'src/call/openNativeCallScreen.ts',
    'src/call/callSignalingPayload.ts',
    'src/call/callNetworkConfig.ts',
    'src/call/parseTurnCredentialsResponse.ts',
    'src/call/callRemoteMedia.ts',
    'src/call/callDebug.ts',
    'src/messages/sendDmOutboundMedia.ts',
    'src/messages/dmDirectR2Upload.ts',
    'src/messages/dmThreadMessageCache.ts',
    'src/messages/dmReadReceipt.ts',
    'src/messages/dmPeerPresence.ts',
    'src/messages/dmThreadRuntime.ts',
    'src/services/appUpdateCheck.ts',
    'src/components/common/AppUpdatePrompt.tsx',
    'src/messages/inboxConversationsCache.ts',
    'src/messages/outboundPendingStore.ts',
    'src/messages/outboundFailedStore.ts',
    'src/services/incomingCallService.ts',
    'src/components/call/IncomingCallOverlay.native.tsx',
    'app/messages/call.tsx',
    'app/messages/[id].tsx',
    'react-native.config.js',
  ];
  for (const f of criticalFiles) {
    if (exists(f)) pass('files', f);
    else fail('files', `Fichier manquant: ${f}`);
  }

  if (exists('android/build.gradle')) {
    const androidBuildGradle = read('android/build.gradle');
    if (
      androidBuildGradle.includes('afw-notifee-local-maven')
      && androidBuildGradle.includes('exclusiveContent')
      && androidBuildGradle.includes('includeGroup "app.notifee"')
    ) {
      pass('android', 'Notifee Maven local (exclusiveContent app.notifee — évite timeout JitPack EAS)');
    } else {
      fail(
        'android',
        'android/build.gradle: exclusiveContent app.notifee manquant (EAS → app.notifee:core:+ timeout JitPack)',
      );
    }
    if (
      androidBuildGradle.includes('afw-jitsi-maven-central')
      && androidBuildGradle.includes('includeGroup "org.jitsi"')
      && androidBuildGradle.includes("force 'org.jitsi:webrtc:124.0.0'")
    ) {
      pass('android', 'Jitsi WebRTC Maven Central (exclusiveContent org.jitsi — évite timeout JitPack EAS)');
    } else {
      fail(
        'android',
        'android/build.gradle: exclusiveContent org.jitsi manquant (EAS → org.jitsi:webrtc:124.+ timeout JitPack)',
      );
    }
  }
}

function checkStaticInvariants() {
  section('3/6 Invariants signalisation / DM / WebRTC');
  const signalingRule = path.join(FRONTEND_ROOT, '..', '.cursor', 'rules', 'call-signaling-locked.mdc');
  if (fs.existsSync(signalingRule)) {
    pass('invariants', 'Règle Cursor call-signaling-locked.mdc présente');
  } else {
    fail('invariants', 'Règle Cursor call-signaling-locked.mdc manquante');
  }

  const overlay = read('src/components/call/IncomingCallOverlay.native.tsx');
  if (/ensureConnectedEmit\s*\(\s*['"]call:accept['"]/.test(overlay)) {
    fail('invariants', 'IncomingCallOverlay émet call:accept (interdit — silence audio)');
  } else {
    pass('invariants', 'IncomingCallOverlay n’émet pas call:accept');
  }

  const callTsx = read('app/messages/call.tsx');
  if (callTsx.includes('buildCallAcceptPayload') && callTsx.includes("ensureConnectedEmit(\n            'call:accept'")) {
    pass('invariants', 'call.tsx envoie call:accept après setup PeerConnection');
  } else if (callTsx.includes("'call:accept'") && callTsx.includes('buildCallAcceptPayload')) {
    pass('invariants', 'call.tsx envoie call:accept (receveur)');
  } else {
    fail('invariants', 'call.tsx : flux call:accept receveur introuvable');
  }

  if (callTsx.includes('parseTurnCredentialsResponse')) {
    pass('invariants', 'call.tsx utilise parseTurnCredentialsResponse (iceServers Metered)');
  } else {
    fail('invariants', 'call.tsx : parseTurnCredentialsResponse manquant');
  }

  if (callTsx.includes('shouldMarkCallConnected')) {
    pass('invariants', 'Chronomètre lié à l’audio distant (shouldMarkCallConnected)');
  } else {
    fail('invariants', 'shouldMarkCallConnected manquant — risque faux « connecté »');
  }

  if (
    callTsx.includes('SafeNativeRtcView')
    && callTsx.includes('remote-video-${remoteStreamKey}')
    && (callTsx.includes('showNativeRemoteRtc')
      || callTsx.includes('showNativeRemoteVideoMain')
      || callTsx.includes('shouldShowNativeRemoteVideoRtc'))
  ) {
    pass('invariants', 'Vidéo native : SafeNativeRtcView distant + remoteStreamKey');
  } else {
    fail('invariants', 'SafeNativeRtcView vidéo distant / remoteStreamKey incomplet');
  }

  if (
    callTsx.includes('hiddenRemoteRtc')
    && callTsx.includes('SafeNativeRtcView')
    && callTsx.includes('remote-audio-${remoteStreamKey}')
  ) {
    pass('invariants', 'Appel audio natif : SafeNativeRtcView caché présent');
  } else {
    fail('invariants', 'SafeNativeRtcView caché manquant pour audio natif');
  }

  if (callTsx.includes('handlePeerAccepted') && callTsx.includes('callerOfferSentRef')) {
    pass('invariants', 'Appelant attend call:accept avant offre SDP');
  } else {
    fail('invariants', 'Ordre signalisation appelant incorrect');
  }

  if (
    callTsx.includes('pickOutboundCallSdp')
    && callTsx.includes('sendSdpFromPeerConnection')
    && callTsx.includes('normalizeInboundCallSignal')
    && callTsx.includes('enqueueSignal')
  ) {
    pass('invariants', 'Signalisation SDP robuste (web + Android + iOS)');
  } else {
    fail('invariants', 'Signalisation SDP robuste incomplète');
  }

  if (callTsx.includes('shouldResendCallerOffer') && callTsx.includes('sdp_resend_offer')) {
    pass('invariants', 'Réémission offre si réponse SDP perdue');
  } else {
    fail('invariants', 'Réémission offre SDP manquante');
  }

  const crashRule = path.join(FRONTEND_ROOT, '..', '.cursor', 'rules', 'call-native-crash-locked.mdc');
  if (fs.existsSync(crashRule)) {
    pass('invariants', 'Règle Cursor call-native-crash-locked.mdc présente');
  } else {
    fail('invariants', 'Règle Cursor call-native-crash-locked.mdc manquante');
  }

  const agoraRule = path.join(FRONTEND_ROOT, '..', '.cursor', 'rules', 'call-dm-agora-locked.mdc');
  if (fs.existsSync(agoraRule)) {
    pass('invariants', 'Règle Cursor call-dm-agora-locked.mdc présente');
  } else {
    fail('invariants', 'Règle Cursor call-dm-agora-locked.mdc manquante');
  }

  if (
    exists('src/call/DirectCallAgoraScreen.native.tsx')
    && exists('src/call/DirectCallAgoraScreen.web.tsx')
    && callTsx.includes('shouldUseAgoraDmCalls')
    && callTsx.includes('DirectCallAgoraScreen')
  ) {
    pass('invariants', 'Appels DM natif — branche Agora + stubs web');
  } else {
    fail('invariants', 'Appels DM Agora natif incomplets (DirectCallAgoraScreen / shouldUseAgoraDmCalls)');
  }

  const layoutTsx = read('../app/_layout.tsx');
  if (/AgoraDmLocalPreviewOverlay/.test(layoutTsx)) {
    pass('invariants', 'PiP local persistant — overlay root _layout');
  } else {
    fail('invariants', 'AgoraDmLocalPreviewOverlay absent de app/_layout.tsx');
  }

  if (
    callTsx.includes('scheduleStopAllMedia')
    && callTsx.includes('nativeRtcUnmounting')
    && callTsx.includes('shouldBlockNativeRtcUrlUpdate')
  ) {
    pass('invariants', 'Anti-crash RTCView : teardown différé + démontage avant PC.close');
  } else {
    fail('invariants', 'Anti-crash RTCView incomplet (scheduleStopAllMedia / nativeRtcUnmounting)');
  }

  if (callTsx.includes('CallScreenErrorBoundary')) {
    pass('invariants', 'CallScreenErrorBoundary enveloppe l’écran d’appel');
  } else {
    fail('invariants', 'CallScreenErrorBoundary manquant sur call.tsx');
  }

  const dmR2 = read('src/messages/dmDirectR2Upload.ts');
  if (dmR2.includes("Platform.OS === 'web'") && dmR2.includes('return null')) {
    pass('invariants', 'Web DM : skip presign R2 (CORS) → multipart backend');
  } else {
    fail('invariants', 'dmDirectR2Upload : garde web CORS manquante');
  }

  const chatScreen = read('app/messages/[id].tsx');
  if (chatScreen.includes('openNativeCallScreen') && chatScreen.includes('saveThreadMessageCache')) {
    pass('invariants', 'Chat : openNativeCallScreen + cache fil DM');
  } else if (chatScreen.includes('openNativeCallScreen')) {
    pass('invariants', 'Chat : openNativeCallScreen');
    warn('invariants', 'Cache fil DM non détecté dans [id].tsx');
  } else {
    fail('invariants', 'Chat : openNativeCallScreen manquant');
  }

  const sendDm = read('src/messages/sendDmOutboundMedia.ts');
  if (sendDm.includes('DM_SEND_MEDIA_NOT_PERSISTED') && sendDm.includes('DM_SEND_NO_MESSAGE_ID')) {
    pass('invariants', 'DM media : validation persistance serveur');
  } else {
    fail('invariants', 'sendDmOutboundMedia : validations persistance manquantes');
  }

  if (fs.existsSync(path.join(FRONTEND_ROOT, 'src', 'messages', 'dmInboxPersistence.ts'))) {
    pass('invariants', 'dmInboxPersistence — garde cache si API vide');
  } else {
    fail('invariants', 'dmInboxPersistence manquant');
  }

  if (
    chatScreen.includes('shouldApplyPeerReceiptEvent') &&
    chatScreen.includes("socketService.on('message:delivered'") &&
    chatScreen.includes('markThreadOpened')
  ) {
    pass('invariants', 'Accusés de lecture : ignore self-read + delivered + markThreadOpened');
  } else {
    fail('invariants', 'Accusés de lecture mobile incomplets dans [id].tsx');
  }

  if (chatScreen.includes('formatPeerPresenceLabel') && chatScreen.includes('/messages/presence/')) {
    pass('invariants', 'Présence peer : API + libellé header fil DM');
  } else {
    fail('invariants', 'Présence peer manquante dans [id].tsx');
  }

  const layout = read('app/_layout.tsx');
  if (layout.includes('AppUpdatePrompt')) {
    pass('invariants', 'MAJ store : AppUpdatePrompt au démarrage');
  } else {
    fail('invariants', 'AppUpdatePrompt manquant dans _layout.tsx');
  }

  if (exists('src/services/callKeepIos.ts') && exists('src/services/callKeepIos.ios.ts')) {
    pass('invariants', 'CallKeep isolé iOS (stub Android)');
  } else {
    fail('invariants', 'callKeepIos plateforme manquant');
  }
}

function checkProdBackend() {
  section('4/6 Backend production (Render)');
  const ok = run('node', [path.join(__dirname, 'verify-call-stack-prod.cjs')], {
    env: { BACKEND_ORIGIN },
  });
  if (!ok) fail('prod', 'verify-call-stack-prod a échoué');
}

function checkScripts() {
  section('5/6 Scripts régression natif');
  if (run('node', [path.join(__dirname, 'verify-eas-org.cjs')])) {
    pass('scripts', 'verify-eas-org (GLOBAL PRODUCTION)');
  } else {
    fail('scripts', 'verify-eas-org — org/projet EAS incorrect');
  }
  if (run('node', [path.join(__dirname, 'verify-android-boot-safety.cjs')])) {
    pass('scripts', 'verify-android-boot-safety');
  } else {
    fail('scripts', 'verify-android-boot-safety');
  }
  if (run('node', [path.join(__dirname, 'verify-expo-filesystem-imports.cjs')])) {
    pass('scripts', 'verify-expo-filesystem-imports');
  } else {
    fail('scripts', 'verify-expo-filesystem-imports');
  }
  if (run('node', [path.join(__dirname, 'verify-prod-crash-safety.cjs')])) {
    pass('scripts', 'verify-prod-crash-safety');
  } else {
    fail('scripts', 'verify-prod-crash-safety');
  }
  if (run('node', [path.join(__dirname, 'verify-dm-call-stack.cjs')], {
    env: { ...process.env, SKIP_AGORA_PROD: process.env.SKIP_AGORA_PROD || '1' },
  })) {
    pass('scripts', 'verify:dm-calls (appels vocal/vidéo — gates locales)');
  } else {
    fail('scripts', 'verify:dm-calls — régression appels DM');
  }
}

function checkUnitTestsAndTypecheck() {
  section('6/6 Tests unitaires + typecheck');

  const testArgs = [
    'run',
    'test',
    '--',
    'src/call/',
    'src/messages/dmThreadMessageCache.test.ts',
    'src/messages/dmReadReceipt.test.ts',
    'src/messages/dmPeerPresence.test.ts',
    'src/messages/dmThreadRuntime.test.ts',
    'src/services/appUpdateCheck.test.ts',
    'src/messages/dmMediaUpload.test.ts',
    'src/messages/dmAccess.test.ts',
    'src/messages/dmHiddenMessages.test.ts',
    'src/messages/dmThreadApi.test.ts',
    'src/services/callKeepIos.test.ts',
    'src/config/devBackendHostUtils.test.ts',
  ];

  if (run('npm', testArgs)) {
    pass('tests', 'suite DM + appels + réseau (Vitest)');
  } else {
    fail('tests', 'suite DM + appels + réseau (Vitest)');
  }

  if (process.env.SKIP_PREAPK_TYPECHECK === '1') {
    warn('typecheck', 'skip (SKIP_PREAPK_TYPECHECK=1)');
  } else if (run('npm', ['run', 'typecheck'])) {
    pass('typecheck', 'tsc --noEmit');
  } else {
    fail('typecheck', 'tsc --noEmit');
  }
}

function printSummary() {
  console.log('\n══════════════════════════════════════════');
  console.log('  RÉSUMÉ PRE-APK AfriWonder');
  console.log('══════════════════════════════════════════');
  console.log(`  ✅ OK        : ${passes.length}`);
  console.log(`  ⚠️  Warnings : ${warnings.length}`);
  console.log(`  ❌ Échecs    : ${failures.length}`);

  if (failures.length > 0) {
    console.log('\n  Corriger avant EAS build :');
    for (const f of failures) {
      console.log(`    • [${f.section}] ${f.detail}`);
    }
  }

  console.log('\n  Après APK vert ici, test manuel obligatoire (2 téléphones) :');
  console.log('    1. DM photo/vocale → delivered → fermer app → média visible');
  console.log('    2. Appel audio 4G → sonnerie → décrocher → audio des 2 côtés');
  console.log('    3. Appel vidéo → caméra locale + distante');
  console.log('\n  À chaque release Play Store (Render) :');
  console.log('    • MOBILE_ANDROID_LATEST_VERSION_CODE = app.json android.versionCode');
  console.log('    • MOBILE_ANDROID_MIN_VERSION_CODE = plus ancienne version encore acceptée');
  console.log('    • GET /api/mobile/app-version doit répondre 200 avant publication');
  console.log('══════════════════════════════════════════\n');

  process.exit(failures.length > 0 ? 1 : 0);
}

async function main() {
  console.log(`\n🔒 Vérification PRE-APK — backend ${BACKEND_ORIGIN}\n`);
  checkStaticManifest();
  checkStaticModulesAndFiles();
  checkStaticInvariants();
  checkProdBackend();
  checkScripts();
  checkUnitTestsAndTypecheck();
  printSummary();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
