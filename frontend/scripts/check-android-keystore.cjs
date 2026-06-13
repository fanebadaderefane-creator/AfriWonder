'use strict';

/**
 * Fail fast before `eas build` when a profile uses local Android credentials.
 * credentials.json + android-keystore.jks are gitignored — must exist on disk locally.
 */
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const credPath = path.join(appRoot, 'credentials.json');
const defaultJksPath = path.join(appRoot, 'android-keystore.jks');

function resolveKeystorePath() {
  if (!fs.existsSync(credPath)) {
    return { ok: false, reason: 'missing-credentials-json', jksPath: defaultJksPath };
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  } catch {
    return { ok: false, reason: 'invalid-credentials-json', jksPath: defaultJksPath };
  }
  const rel = parsed?.android?.keystore?.keystorePath || './android-keystore.jks';
  const jksPath = path.resolve(appRoot, rel);
  if (!fs.existsSync(jksPath)) {
    return { ok: false, reason: 'missing-keystore-jks', jksPath };
  }
  return { ok: true, jksPath };
}

function printHelp(reason, jksPath) {
  if (reason === 'missing-credentials-json') {
    console.error('\n[eas] MISSING frontend/credentials.json');
    console.error('      Copy credentials.json.example and fill keystore passwords.');
  } else if (reason === 'invalid-credentials-json') {
    console.error('\n[eas] INVALID frontend/credentials.json (JSON parse error).');
  } else {
    console.error('\n[eas] MISSING Android keystore file:');
    console.error(`      ${jksPath}`);
    console.error('');
    console.error('      EAS cannot sign the APK without this file. Passwords alone are not enough.');
    console.error('      1. expo.dev → project → Credentials → Android → Download keystore');
    console.error(`      2. Save as: ${defaultJksPath}`);
    console.error('      3. Re-run: npm run eas:android:callDiagnostic');
    console.error('');
    console.error('      Alternative (one-time upload to global-production):');
    console.error('      cd frontend && eas credentials -p android');
  }
}

function main() {
  const result = resolveKeystorePath();
  if (!result.ok) {
    printHelp(result.reason, result.jksPath);
    process.exit(1);
  }
  console.log(`[eas] OK local Android keystore: ${result.jksPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { resolveKeystorePath };
