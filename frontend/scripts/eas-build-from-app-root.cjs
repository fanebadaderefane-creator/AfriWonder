'use strict';

/**
 * Monorepo: EAS archives from the git repository root by default, which uploads backend/PWA/etc.
 * With EAS_NO_VCS + EAS_PROJECT_ROOT set to this app folder, the archive is only `frontend/`
 * and respects `frontend/.easignore` (see https://expo.fyi/eas-build-archive).
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const appRoot = path.resolve(__dirname, '..');
process.env.EAS_NO_VCS = '1';
process.env.EAS_PROJECT_ROOT = appRoot;

const passthrough = process.argv.slice(2);
const easArgs = ['build', ...passthrough];

function readArgValue(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}

function profileUsesLocalAndroidCredentials(profileName) {
  if (!profileName) return false;
  const easJsonPath = path.join(appRoot, 'eas.json');
  let easJson;
  try {
    easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  } catch {
    return false;
  }
  const profile = easJson?.build?.[profileName];
  if (!profile) return false;
  const androidSource = profile?.android?.credentialsSource;
  const rootSource = profile?.credentialsSource;
  return androidSource === 'local' || rootSource === 'local';
}

const platform = readArgValue(passthrough, '--platform');
const profile = readArgValue(passthrough, '--profile');

function runNodeScript(scriptName) {
  return spawnSync('node', [path.join(__dirname, scriptName)], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
}

if (platform === 'android' && profileUsesLocalAndroidCredentials(profile)) {
  const { resolveKeystorePath } = require('./check-android-keystore.cjs');
  const keystoreCheck = resolveKeystorePath();
  if (!keystoreCheck.ok) {
    console.log('[eas] Keystore locale absente — téléchargement depuis EAS…');
    const sync = runNodeScript('sync-android-keystore-from-eas.cjs');
    if (sync.status !== 0) {
      process.exit(sync.status === null ? 1 : sync.status);
    }
  }
  const check = runNodeScript('check-android-keystore.cjs');
  if (check.status !== 0) {
    process.exit(check.status === null ? 1 : check.status);
  }
}

const result = spawnSync('eas', easArgs, {
  cwd: appRoot,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

const exitCode = result.status === null ? 1 : result.status;

if (exitCode === 0) {
  const profile = readArgValue(passthrough, '--profile');
  const platform = readArgValue(passthrough, '--platform');
  if (profile === 'production') {
    const syncArgs = [
      path.join(__dirname, 'sync-render-mobile-version.cjs'),
      ...(platform ? ['--platform', platform] : []),
    ];
    console.log('\n[eas] Build production OK — sync Render MOBILE_ANDROID_LATEST_VERSION_CODE…');
    const sync = spawnSync('node', syncArgs, {
      cwd: appRoot,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32',
    });
    if (sync.status !== 0) {
      console.warn(
        '[eas] Sync Render ignoré ou échoué. Configurez RENDER_API_KEY + RENDER_SERVICE_ID, ou lancez : npm run sync:render:mobile-version',
      );
    }
  }
}

process.exit(exitCode);
