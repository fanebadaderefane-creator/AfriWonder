'use strict';

/**
 * Fail fast before `eas build` when a profile uses local Android credentials.
 * credentials.json + android-keystore.jks are gitignored — must exist on disk locally.
 */
const fs = require('fs');
const path = require('path');
const {
  formatProductionHint,
  inspectLocalKeystore,
  isRequiredProdAabSigning,
  isAllowedForProduction,
} = require('./androidKeystoreInspect.cjs');
const { PLAY_UPLOAD } = require('./androidSigningPolicy.cjs');

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
    console.error('      1. Installez la keystore upload Play (SHA-1 FA:AC:66…) :');
    console.error('         node scripts/install-android-prod-keystore.cjs --jks PATH --alias ALIAS --storepass PASS');
    console.error('      2. NE PAS npm run sync:android-keystore pour production (clé EAS E9:26:B0…).');
    console.error('      3. Re-run: npm run eas:android:production');
  }
}

function verifyProductionFingerprint(requireProduction) {
  const inspection = inspectLocalKeystore(appRoot);
  if (!inspection.ok) {
    if (inspection.reason === 'keytool-failed') {
      console.error('\n[eas] Keystore présente mais keytool a échoué.');
      console.error(`      ${inspection.message}`);
      process.exit(1);
    }
    return;
  }
  console.log(`[eas] Keystore SHA-1 : ${inspection.sha1}`);
  console.log(`[eas] ${formatProductionHint(inspection.sha1)}`);
  if (requireProduction && !isAllowedForProduction(inspection.sha1)) {
    console.error('\n[eas] REFUS — clé interdite (EAS auto-générée E9:26:B0…).');
    process.exit(1);
  }
  if (requireProduction && !isRequiredProdAabSigning(inspection.sha1)) {
    console.error('\n[eas] REFUS AAB production — clé upload Play requise.');
    console.error(`      Play Console attend : ${PLAY_UPLOAD.sha1}`);
    console.error(`      Détecté             : ${inspection.sha1}`);
    console.error('      Restaurez @abdoulaye_fane__afriwonder.jks : node scripts/install-android-prod-keystore.cjs …');
    process.exit(1);
  }
  if (requireProduction) {
    console.log('[eas] OK — AAB sera signé avec la clé upload Play (FA:AC:66…).');
  }
}

function checkEasignoreAllowsLocalSigning() {
  const easignorePath = path.join(appRoot, '.easignore');
  if (!fs.existsSync(easignorePath)) return;
  const text = fs.readFileSync(easignorePath, 'utf8');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.some((l) => l === 'credentials.json')) {
    console.error('\n[eas] REFUS — .easignore exclut credentials.json.');
    console.error('      EAS signera avec la clé distante (E9:26:B0…) au lieu de votre keystore locale.');
    console.error('      Retirez credentials.json de frontend/.easignore');
    process.exit(1);
  }
  const blocksAllJks = lines.some((l) => l === '*.jks');
  const allowsProdJks = lines.some((l) => l === '!android-keystore.jks');
  if (blocksAllJks && !allowsProdJks) {
    console.error('\n[eas] REFUS — .easignore exclut *.jks sans !android-keystore.jks');
    console.error('      Ajoutez !android-keystore.jks sous *.jks dans frontend/.easignore');
    process.exit(1);
  }
}

function main() {
  const requireProduction = process.argv.includes('--production');
  if (requireProduction) checkEasignoreAllowsLocalSigning();
  const result = resolveKeystorePath();
  if (!result.ok) {
    printHelp(result.reason, result.jksPath);
    process.exit(1);
  }
  console.log(`[eas] OK local Android keystore: ${result.jksPath}`);
  verifyProductionFingerprint(requireProduction);
}

if (require.main === module) {
  main();
}

module.exports = { resolveKeystorePath, verifyProductionFingerprint };
