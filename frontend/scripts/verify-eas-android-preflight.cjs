'use strict';

/**
 * Gate avant `eas build -p android` — reproduit les échecs EAS Maven :
 * - b8c680a0 : app.notifee:core:+ via JitPack (timeout)
 * - d533d63c : org.jitsi:webrtc:124.+ via JitPack (timeout)
 */
const fs = require('fs');
const os = require('os');
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

function jdkHomeCandidates() {
  const home = os.homedir();
  const list = [
    process.env.AFW_JAVA_HOME,
    process.env.JAVA_HOME,
    path.join(home, 'scoop', 'apps', 'temurin17-jdk', 'current'),
    path.join(home, 'scoop', 'apps', 'temurin21-jdk', 'current'),
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Java\\jdk-17',
    'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot',
  ].filter(Boolean);
  return [...new Set(list)];
}

function resolveGradleJavaHome() {
  for (const candidate of jdkHomeCandidates()) {
    const javaBin =
      process.platform === 'win32'
        ? path.join(candidate, 'bin', 'java.exe')
        : path.join(candidate, 'bin', 'java');
    if (!fs.existsSync(javaBin)) continue;
    const ver = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
    const blob = `${ver.stderr || ''}\n${ver.stdout || ''}`;
    const m = blob.match(/version "(\d+)/);
    const major = m ? Number(m[1]) : 0;
    if (major === 17 || major === 21) {
      return { home: candidate, major };
    }
  }
  return null;
}

function printGradleJavaHelp(out) {
  if (/languageVersion=17/i.test(out) || /Cannot find a Java installation/i.test(out)) {
    console.error(
      '\n[eas-preflight] JDK 17 requis pour le dry-run Gradle local (EAS cloud a son propre JDK).',
    );
    console.error('  scoop install temurin17-jdk');
    console.error('  $env:JAVA_HOME = "$env:USERPROFILE\\scoop\\apps\\temurin17-jdk\\current"');
    console.error('  Ou lancez avec AFW_EAS_SKIP_GRADLE_PREFLIGHT=1 (build cloud uniquement).');
  }
  if (/PKIX path building failed/i.test(out) || /certificate_unknown/i.test(out)) {
    console.error(
      '\n[eas-preflight] Erreur certificat SSL (Gradle / foojay) — proxy ou antivirus MITM.',
    );
    console.error('  Installez JDK 17 en local (scoop) pour éviter le téléchargement auto.');
    console.error('  Ou AFW_EAS_SKIP_GRADLE_PREFLIGHT=1 pour soumettre quand même à EAS.');
  }
}

function checkGradleReleaseNativeLibsDryRun() {
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
  const androidDir = path.join(appRoot, 'android');
  if (!fs.existsSync(path.join(androidDir, gradlew))) {
    fail('gradlew absent', androidDir);
    return;
  }
  const jdk = resolveGradleJavaHome();
  if (jdk) {
    console.log(`[eas-preflight] Gradle JVM : JDK ${jdk.major} (${jdk.home})`);
  } else {
    console.log('[eas-preflight] Aucun JDK 17/21 détecté — Gradle tentera foojay (peut échouer SSL).');
  }
  console.log('[eas-preflight] Gradle :app:mergeReleaseNativeLibs --dry-run (tâche EAS en échec)…');
  const gradleEnv = {
    ...process.env,
    GRADLE_OPTS: '-Dorg.gradle.daemon=false',
  };
  if (jdk?.home) {
    gradleEnv.JAVA_HOME = jdk.home;
    gradleEnv.ORG_GRADLE_JAVA_HOME = jdk.home;
  }
  const result = spawnSync(
    process.platform === 'win32' ? 'cmd.exe' : gradlew,
    process.platform === 'win32'
      ? ['/c', gradlew, ':app:mergeReleaseNativeLibs', '--dry-run']
      : [':app:mergeReleaseNativeLibs', '--dry-run'],
    {
      cwd: androidDir,
      encoding: 'utf8',
      env: gradleEnv,
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
    printGradleJavaHelp(out);
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
const skipGradle =
  args.has('--skip-gradle') ||
  process.env.AFW_EAS_SKIP_GRADLE_PREFLIGHT === '1' ||
  process.env.AFW_EAS_SKIP_GRADLE_PREFLIGHT === 'true';
const withGradle = (args.has('--gradle') || args.has('--full')) && !skipGradle;

checkNotifeeGradleRouting();
checkJitsiGradleRouting();
checkNotifeeArtifacts();
checkAndroidUploadable();
checkKeystore();

if (skipGradle) {
  console.log(
    '[eas-preflight] Gradle dry-run ignoré (AFW_EAS_SKIP_GRADLE_PREFLIGHT / --skip-gradle) — build EAS cloud OK.',
  );
} else if (withGradle) {
  checkGradleReleaseNativeLibsDryRun();
} else {
  console.log('[eas-preflight] Astuce: --gradle pour tester mergeReleaseNativeLibs (≈2–3 min).');
}

if (failed > 0) {
  console.error(`\n[eas-preflight] ${failed} contrôle(s) en échec — ne lancez pas EAS tant que ce n'est pas corrigé.`);
  process.exit(1);
}

console.log('\n[eas-preflight] Prêt pour npm run eas:android:callDiagnostic');
