'use strict';

/**
 * Régression : crash Android au boot avec New Architecture + react-native-callkeep.
 * Voir react-native.config.js et src/services/callKeepIos.*.ts
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
let failed = false;

function fail(msg) {
  console.error(`[verify:android-boot] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[verify:android-boot] OK: ${msg}`);
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === '.git' || name.name === 'dist') continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx|cjs|mjs)$/.test(name.name)) acc.push(full);
  }
  return acc;
}

// 1) Autolinking Android désactivé pour callkeep
const rnConfigPath = path.join(frontendRoot, 'react-native.config.js');
if (!fs.existsSync(rnConfigPath)) {
  fail('react-native.config.js manquant');
} else {
  const rnConfig = require(rnConfigPath);
  const android = rnConfig?.dependencies?.['react-native-callkeep']?.platforms?.android;
  if (android !== null) {
    fail('react-native-callkeep doit avoir platforms.android: null dans react-native.config.js');
  } else {
    ok('CallKeep exclu du build Android (autolinking)');
  }
}

// 2) Fichiers plateforme iOS / stub Android
const iosStub = path.join(frontendRoot, 'src', 'services', 'callKeepIos.ios.ts');
const androidStub = path.join(frontendRoot, 'src', 'services', 'callKeepIos.ts');
if (!fs.existsSync(iosStub) || !fs.existsSync(androidStub)) {
  fail('callKeepIos.ios.ts et callKeepIos.ts requis');
} else {
  ok('Modules callKeepIos plateforme présents');
}

// 3) Aucun import direct de callkeep hors fichier iOS
const allowed = new Set([
  path.normalize(iosStub).toLowerCase(),
  path.normalize(path.join(frontendRoot, 'scripts', 'verify-android-boot-safety.cjs')).toLowerCase(),
]);
const importRe = /from\s+['"]react-native-callkeep['"]|require\s*\(\s*['"]react-native-callkeep['"]\s*\)/;

for (const file of walk(frontendRoot)) {
  const norm = file.toLowerCase();
  if (allowed.has(norm)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (importRe.test(text)) {
    fail(`import react-native-callkeep interdit: ${path.relative(frontendRoot, file)}`);
  }
}

// 4) incomingCallService utilise le wrapper plateforme
const incomingPath = path.join(frontendRoot, 'src', 'services', 'incomingCallService.ts');
const incomingText = fs.readFileSync(incomingPath, 'utf8');
if (!incomingText.includes("from './callKeepIos'")) {
  fail('incomingCallService.ts doit importer getCallKeep depuis ./callKeepIos');
} else if (importRe.test(incomingText)) {
  fail('incomingCallService.ts ne doit pas importer react-native-callkeep directement');
} else {
  ok('incomingCallService.ts isolé via callKeepIos');
}

// 5) Firebase/FCM différé + garde GMS avant token push (évite crash prod sans Play Services)
const appJsonPath = path.join(frontendRoot, 'app.json');
const deferPluginPath = path.join(frontendRoot, 'plugins', 'withAndroidDeferFirebaseInit.js');
const gmsLibPath = path.join(frontendRoot, 'src', 'lib', 'googlePlayServices.android.ts');
const notifPath = path.join(frontendRoot, 'src', 'services', 'notificationService.ts');

if (!fs.existsSync(deferPluginPath)) {
  fail('plugins/withAndroidDeferFirebaseInit.js manquant');
} else {
  ok('Plugin withAndroidDeferFirebaseInit présent');
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const plugins = appJson.expo?.plugins ?? [];
const hasDeferPlugin = plugins.some(
  (p) => p === './plugins/withAndroidDeferFirebaseInit.js' || p?.[0] === './plugins/withAndroidDeferFirebaseInit.js',
);
if (!hasDeferPlugin) {
  fail('app.json doit référencer ./plugins/withAndroidDeferFirebaseInit.js');
} else {
  ok('Plugin Firebase différé enregistré dans app.json');
}

if (!fs.existsSync(gmsLibPath)) {
  fail('src/lib/googlePlayServices.android.ts manquant');
} else {
  ok('Module googlePlayServices.android présent');
}

const notifText = fs.readFileSync(notifPath, 'utf8');
if (!notifText.includes('isGoogleMobileServicesReady')) {
  fail('notificationService.ts doit vérifier isGoogleMobileServicesReady avant FCM');
} else {
  ok('notificationService.ts protégé contre GMS absent');
}

if (failed) {
  process.exit(1);
}

console.log('[verify:android-boot] Tous les contrôles passés.');
process.exit(0);
