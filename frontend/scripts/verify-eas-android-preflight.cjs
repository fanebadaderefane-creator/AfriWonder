'use strict';

/**
 * Gate avant `eas build -p android` — reproduit les échecs EAS Maven :
 * - b8c680a0 : app.notifee:core:+ via JitPack (timeout)
 * - d533d63c : org.jitsi:webrtc:124.+ via JitPack (timeout)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const buildGradlePath = path.join(appRoot, 'android', 'build.gradle');
const notifeeMavenMeta = path.join(
  appRoot,
  'node_modules',
  '@notifee',
  'react-native',
  'android',
  'libs',
  'app',
  'notifee',
  'core',
  'maven-metadata.xml',
);

let failed = 0;
function pass(label) {
  console.log(`[eas-preflight] OK ${label}`);
}
function fail(label, detail) {
  failed += 1;
  console.error(`[eas-preflight] FAIL ${label}`);
  if (detail) console.error(`              ${detail}`);
}

function checkNotifeeGradleRouting() {
  if (!fs.existsSync(buildGradlePath)) {
    fail('android/build.gradle manquant', 'Lancez expo prebuild ou gardez le dossier android/ local.');
    return;
  }
  const contents = fs.readFileSync(buildGradlePath, 'utf8');
  if (!contents.includes('afw-notifee-local-maven')) {
    fail(
      'Notifee Maven local absent',
      'Plugin withAndroidNotifeeMaven non appliqué — Gradle tentera JitPack pour app.notifee:core:+.',
    );
    return;
  }
  if (!contents.includes('exclusiveContent') || !contents.includes('includeGroup "app.notifee"')) {
    fail(
      'exclusiveContent app.notifee manquant',
      'Sans routage exclusif, EAS peut time-out sur https://www.jitpack.io/app/notifee/core/…',
    );
    return;
  }
  const exclusiveIdx = contents.indexOf('exclusiveContent');
  const jitpackIdx = contents.indexOf('jitpack.io');
  if (jitpackIdx >= 0 && exclusiveIdx > jitpackIdx) {
    fail(
      'Ordre Maven incorrect',
      'exclusiveContent app.notifee doit être AVANT jitpack.io dans android/build.gradle.',
    );
    return;
  }
  pass('Notifee → Maven local (exclusiveContent, avant JitPack)');
}

function checkJitsiGradleRouting() {
  if (!fs.existsSync(buildGradlePath)) {
    return;
  }
  const contents = fs.readFileSync(buildGradlePath, 'utf8');
  if (!contents.includes('afw-jitsi-maven-central')) {
    fail(
      'Jitsi Maven Central absent',
      'Plugin withAndroidJitsiWebRtcMaven non appliqué — Gradle tentera JitPack pour org.jitsi:webrtc:124.+.',
    );
    return;
  }
  if (!contents.includes('includeGroup "org.jitsi"')) {
    fail(
      'exclusiveContent org.jitsi manquant',
      'Sans routage exclusif, EAS peut time-out sur https://www.jitpack.io/org/jitsi/webrtc/…',
    );
    return;
  }
  if (!contents.includes("force 'org.jitsi:webrtc:124.0.0'")) {
    fail(
      'Version org.jitsi:webrtc non épinglée',
      'Ajoutez resolutionStrategy.force org.jitsi:webrtc:124.0.0 pour éviter metadata 124.+ sur tous les dépôts.',
    );
    return;
  }
  const jitsiIdx = contents.indexOf('includeGroup "org.jitsi"');
  const jitpackIdx = contents.indexOf('jitpack.io');
  if (jitpackIdx >= 0 && jitsiIdx > jitpackIdx) {
    fail(
      'Ordre Maven Jitsi incorrect',
      'exclusiveContent org.jitsi doit être AVANT jitpack.io dans android/build.gradle.',
    );
    return;
  }
  pass('Jitsi WebRTC → Maven Central (exclusiveContent + 124.0.0, avant JitPack)');
}

function checkNotifeeArtifacts() {
  if (!fs.existsSync(notifeeMavenMeta)) {
    fail(
      'Artefacts Maven Notifee absents',
      'npm install puis vérifiez node_modules/@notifee/react-native/android/libs/',
    );
    return;
  }
  pass('Artefacts Maven Notifee présents (libs/app/notifee/core)');
}

function checkAndroidUploadable() {
  if (!fs.existsSync(path.join(appRoot, 'android', 'settings.gradle'))) {
    fail('Dossier android/ incomplet', 'EAS skip prebuild si android/ absent — build.gradle Notifee non appliqué.');
    return;
  }
  pass('Dossier android/ présent (sera uploadé à EAS — prebuild skip)');
}

function checkKeystore() {
  const { resolveKeystorePath } = require('./check-android-keystore.cjs');
  const result = resolveKeystorePath();
  if (!result.ok) {
    fail('Keystore Android local', result.reason);
    return;
  }
  pass(`Keystore Android local (${path.basename(result.jksPath)})`);
}

function checkGradleReleaseNativeLibsDryRun() {
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  const androidDir = path.join(appRoot, 'android');
  if (!fs.existsSync(path.join(androidDir, gradlew))) {
    fail('gradlew absent', androidDir);
    return;
  }
  console.log('[eas-preflight] Gradle :app:mergeReleaseNativeLibs --dry-run (tâche EAS en échec)…');
  const result = spawnSync(
    process.platform === 'win32' ? 'cmd.exe' : gradlew,
    process.platform === 'win32'
      ? ['/c', gradlew, ':app:mergeReleaseNativeLibs', '--dry-run']
      : [':app:mergeReleaseNativeLibs', '--dry-run'],
    {
      cwd: androidDir,
      encoding: 'utf8',
      env: { ...process.env, GRADLE_OPTS: '-Dorg.gradle.daemon=false' },
      shell: false,
      maxBuffer: 20 * 1024 * 1024,
    },
  );
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) {
    if (/app\.notifee:core/i.test(out) || /jitpack\.io\/app\/notifee/i.test(out)) {
      fail(
        'Gradle mergeReleaseNativeLibs (Notifee/JitPack)',
        'Même erreur que EAS — corrigez android/build.gradle exclusiveContent.',
      );
    } else if (/org\.jitsi:webrtc/i.test(out) || /jitpack\.io\/org\/jitsi/i.test(out)) {
      fail(
        'Gradle mergeReleaseNativeLibs (Jitsi/JitPack)',
        'Même erreur que EAS — corrigez android/build.gradle exclusiveContent org.jitsi.',
      );
    } else {
      fail('Gradle mergeReleaseNativeLibs --dry-run', `exit ${result.status}`);
    }
    const tail = out.split('\n').slice(-12).join('\n');
    if (tail.trim()) console.error(tail);
    return;
  }
  if (/BUILD SUCCESSFUL/i.test(out)) {
    pass('Gradle :app:mergeReleaseNativeLibs --dry-run');
  } else {
    fail('Gradle mergeReleaseNativeLibs — sortie inattendue');
  }
}

const args = new Set(process.argv.slice(2));
const withGradle = args.has('--gradle') || args.has('--full');

checkNotifeeGradleRouting();
checkJitsiGradleRouting();
checkNotifeeArtifacts();
checkAndroidUploadable();
checkKeystore();

if (withGradle) {
  checkGradleReleaseNativeLibsDryRun();
} else {
  console.log('[eas-preflight] Astuce: --gradle pour tester mergeReleaseNativeLibs (≈2–3 min).');
}

if (failed > 0) {
  console.error(`\n[eas-preflight] ${failed} contrôle(s) en échec — ne lancez pas EAS tant que ce n'est pas corrigé.`);
  process.exit(1);
}

console.log('\n[eas-preflight] Prêt pour npm run eas:android:callDiagnostic');
