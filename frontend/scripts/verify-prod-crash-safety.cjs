#!/usr/bin/env node
/**
 * Audit anti-crash production AfriWonder :
 * - Expo mobile natif (APK/IPA) + Expo web (frontend/, RN Web — PAS la PWA Vite)
 * - PWA Vite séparée (racine src/) + backend Node
 * À lancer avant chaque release : cd frontend && npm run verify:crash-safety
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND = path.resolve(__dirname, '..');
const REPO = path.resolve(FRONTEND, '..');
const failures = [];
const passes = [];
const warnings = [];

function ok(d) {
  passes.push(d);
  console.log(`  ✅ ${d}`);
}
function fail(d) {
  failures.push(d);
  console.error(`  ❌ ${d}`);
}
function warn(d) {
  warnings.push(d);
  console.warn(`  ⚠️  ${d}`);
}

function read(rel, root = FRONTEND) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel, root = FRONTEND) {
  return fs.existsSync(path.join(root, rel));
}

function runNode(scriptRel, env = {}) {
  const r = spawnSync('node', [path.join(FRONTEND, scriptRel)], {
    cwd: FRONTEND,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  });
  return r.status === 0;
}

function checkPattern(label, fileRel, patterns, root = FRONTEND) {
  const text = read(fileRel, root);
  for (const [name, re] of patterns) {
    if (re.test(text)) ok(`${label}: ${name}`);
    else fail(`${label}: ${name}`);
  }
}

console.log('\n🛡️  Audit anti-crash production — AfriWonder A→Z\n');

console.log('━━ 1/8 Mobile — boot & modules natifs ━━');
if (runNode('scripts/verify-android-boot-safety.cjs')) {
  ok('verify-android-boot-safety');
} else {
  fail('verify-android-boot-safety');
}
if (runNode('scripts/verify-expo-filesystem-imports.cjs')) {
  ok('verify-expo-filesystem-imports');
} else {
  fail('verify-expo-filesystem-imports');
}

const webrtcLoader = read('src/call/tryLoadReactNativeWebRtc.ts');
if (/isNativeWebRtcAvailable/.test(webrtcLoader) && /WebRTCModule/.test(webrtcLoader)) {
  ok('WebRTC chargé seulement si WebRTCModule présent');
} else {
  fail('tryLoadReactNativeWebRtc — garde Expo Go');
}

const polyfills = read('src/polyfills.ts');
if (/WebRTCModule/.test(polyfills) && /registerGlobals/.test(polyfills)) {
  ok('polyfills.ts — registerGlobals gardé par WebRTCModule');
} else {
  fail('polyfills.ts — garde WebRTCModule manquante');
}

const iapNative = read('src/wallet/coinIapPurchase.native.ts');
const iapValueImport = /import\s+(?!type\b)[^;]*from\s+['"]react-native-iap['"]/.test(iapNative);
const iapDynamic = /import\s*\(\s*['"]react-native-iap['"]\s*\)/.test(iapNative);
if (iapDynamic && !iapValueImport) {
  ok('coinIapPurchase — import dynamique react-native-iap');
} else {
  fail('coinIapPurchase — import statique IAP (crash Expo Go)');
}

console.log('\n━━ 2/8 Mobile — runtime guards & mémoire ━━');
checkPattern('_layout.tsx', 'app/_layout.tsx', [
  ['initMobileSentry', /initMobileSentry\(\)/],
  ['installMobileRuntimeGuards', /installMobileRuntimeGuards\(\)/],
  ['installMobileSessionStability', /installMobileSessionStability\(\)/],
  ['AppRootErrorBoundary', /AppRootErrorBoundary/],
  ['MobileNavigationStability', /MobileNavigationStability/],
  ['QueryCache onError → Sentry', /queryCache:[\s\S]*onError/],
]);

checkPattern('mobileRuntimeGuards', 'src/lib/mobileRuntimeGuards.ts', [
  ['ErrorUtils globalHandler', /ErrorUtils/],
  ['onunhandledrejection', /onunhandledrejection/],
  ['captureSentryException', /captureSentryException/],
]);

checkPattern('mobileMemoryMaintenance', 'src/lib/mobileMemoryMaintenance.ts', [
  ['trimMobileAppCaches', /trimMobileAppCaches/],
  ['memoryWarning listener', /ios-memoryWarning|memoryWarning/],
]);

console.log('\n━━ 3/8 Expo appels — natif + web (frontend/app/messages/call.tsx) ━━');
if (runNode('scripts/verify-mobile-call-native.cjs')) {
  ok('verify-mobile-call-native');
} else {
  fail('verify-mobile-call-native');
}

const callTsx = read('app/messages/call.tsx');
if (!/<RTCView[\s>]/.test(callTsx) && callTsx.includes('SafeNativeRtcView')) {
  ok('call.tsx — pas de RTCView brut, SafeNativeRtcView uniquement');
} else if (/<RTCView[\s>]/.test(callTsx)) {
  fail('call.tsx — RTCView brut interdit (crash natif)');
} else {
  fail('call.tsx — SafeNativeRtcView manquant');
}

for (const rule of ['call-signaling-locked.mdc', 'call-native-crash-locked.mdc']) {
  const p = path.join(REPO, '.cursor', 'rules', rule);
  if (fs.existsSync(p)) ok(`Règle Cursor ${rule}`);
  else fail(`Règle Cursor ${rule} manquante`);
}

console.log('\n━━ 4/8 Mobile — écrans sensibles (error boundaries) ━━');
if (exists('src/components/call/CallScreenErrorBoundary.tsx')) ok('CallScreenErrorBoundary');
else fail('CallScreenErrorBoundary manquant');

if (exists('src/components/menu/MenuPlusErrorBoundary.tsx')) ok('MenuPlusErrorBoundary');
else fail('MenuPlusErrorBoundary manquant');

if (exists('src/components/common/AppRootErrorBoundary.tsx')) ok('AppRootErrorBoundary');
else fail('AppRootErrorBoundary manquant');

const safeRouter = read('src/utils/safeRouter.ts');
if (/captureSentryException/.test(safeRouter) && /safeRouterBack/.test(safeRouter)) {
  ok('safeRouter — navigation protégée + Sentry');
} else {
  fail('safeRouter incomplet');
}

console.log('\n━━ 5/8 Mobile — DM / chat / notifications ━━');
checkPattern('incomingCallService', 'src/services/incomingCallService.ts', [
  ['navigateToReceiverCallScreen', /navigateToReceiverCallScreen/],
  ['callKeepIos wrapper', /callKeepIos/],
]);

const overlay = read('src/components/call/IncomingCallOverlay.native.tsx');
if (!/ensureConnectedEmit\s*\(\s*['"]call:accept['"]/.test(overlay)) {
  ok('IncomingCallOverlay n’émet pas call:accept trop tôt');
} else {
  fail('IncomingCallOverlay — call:accept prématuré');
}

const notifSvc = read('src/services/notificationService.ts');
if (/isGoogleMobileServicesReady|googlePlayServices/.test(notifSvc)) {
  ok('notificationService — garde Google Play Services');
} else {
  fail('notificationService — pas de garde GMS');
}

const callTsxWeb = read('app/messages/call.tsx');
if (/isWebRuntime|Platform\.OS === 'web'/.test(callTsxWeb)) {
  ok('call.tsx — branche Expo web (RN Web, même écran que natif)');
} else {
  fail('call.tsx — branche Expo web introuvable');
}
if (exists('src/services/incomingCallService.web.ts')) {
  ok('incomingCallService.web.ts — variante Expo web');
} else {
  fail('incomingCallService.web.ts manquant');
}

console.log('\n━━ 6/8 PWA Vite séparée (racine src/ — hors frontend/) ━━');
if (exists('src/components/common/ErrorBoundary.jsx', REPO)) {
  ok('PWA Vite ErrorBoundary.jsx');
} else {
  fail('PWA Vite ErrorBoundary.jsx manquant');
}

const mainJsx = read('src/main.jsx', REPO);
if (/ErrorBoundary/.test(mainJsx)) ok('PWA Vite main.jsx enveloppe ErrorBoundary');
else fail('PWA Vite main.jsx sans ErrorBoundary');

const expoPoly = read('src/polyfills.ts');
if (/unhandledrejection/.test(expoPoly) || /installWebVideoPlayPromiseGuards/.test(expoPoly)) {
  ok('frontend polyfills.ts — garde promesses / vidéo (Expo web + natif)');
} else {
  warn('frontend polyfills.ts — garde promesses limitée');
}

console.log('\n━━ 7/8 Backend — erreurs non gérées ━━');
const appTs = read('src/app.ts', path.join(REPO, 'backend'));
if (/errorHandler/.test(appTs)) ok('backend app.ts — errorHandler middleware');
else fail('backend errorHandler manquant');

const errHandler = read('src/middleware/errorHandler.ts', path.join(REPO, 'backend'));
if (/res\.status/.test(errHandler) && /ZodError|AppError/.test(errHandler)) {
  ok('errorHandler — réponses structurées');
} else {
  warn('errorHandler — vérifier format erreurs');
}

const indexTs = read('src/index.ts', path.join(REPO, 'backend'));
if (/gracefulShutdown/.test(indexTs) && /SIGTERM/.test(indexTs)) {
  ok('backend index.ts — gracefulShutdown SIGTERM/SIGINT');
} else {
  fail('backend gracefulShutdown manquant');
}

console.log('\n━━ 8/8 Tests unitaires anti-crash ━━');
const testOk = spawnSync(
  'npm',
  [
    'run',
    'test',
    '--',
    'src/call/callNativeTeardown.test.ts',
    'src/call/callRtcStreamUrl.test.ts',
    'src/call/callSessionStability.test.ts',
    'src/lib/mobileMemoryMaintenance.test.ts',
    'src/lib/mobileRuntimeGuards.test.ts',
    'src/services/callKeepIos.test.ts',
  ],
  {
    cwd: FRONTEND,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
).status === 0;

if (testOk) ok('Tests Vitest anti-crash');
else fail('Tests Vitest anti-crash');

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  ⚠️  Warnings: ${warnings.length}  |  ❌ Échecs: ${failures.length}`);
console.log('\n  Test terrain obligatoire (non automatisable) :');
console.log('    • 2 APK réels — appel vocal + vidéo, raccrocher ×10 sans crash OS');
console.log('    • Navigation Menu+ → Messages → Appel → Retour ×20');
console.log('    • Appareil 2–3 Go RAM (Mali)');
console.log('══════════════════════════════════════════\n');

process.exit(failures.length ? 1 : 0);
