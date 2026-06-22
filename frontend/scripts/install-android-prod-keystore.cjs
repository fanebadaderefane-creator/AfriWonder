'use strict';

/**
 * Installe la keystore prod FBF-GLOBAL (FANE ABDOULAYE) pour signer les AAB.
 * Usage: node scripts/install-android-prod-keystore.cjs --jks "C:\backup\afriwonder-prod.jks" --alias MON_ALIAS --storepass XXX
 */
const fs = require('fs');
const path = require('path');
const { inspectKeystoreFile } = require('./androidKeystoreInspect.cjs');
const { PROD_APP_SIGNING, PLAY_UPLOAD } = require('./androidSigningPolicy.cjs');

const appRoot = path.resolve(__dirname, '..');
const destJks = path.join(appRoot, 'android-keystore.jks');
const destCred = path.join(appRoot, 'credentials.json');

function readArg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : '';
}

function main() {
  const jks = readArg('--jks');
  const alias = readArg('--alias');
  const storepass = readArg('--storepass');
  const keypass = readArg('--keypass') || storepass;
  if (!jks || !alias || !storepass) {
    console.error(
      'Usage: node scripts/install-android-prod-keystore.cjs --jks PATH --alias ALIAS --storepass PASS [--keypass PASS]',
    );
    process.exit(1);
  }
  const src = path.resolve(jks);
  if (!fs.existsSync(src)) {
    console.error(`Fichier introuvable: ${src}`);
    process.exit(1);
  }

  let inspection;
  try {
    inspection = inspectKeystoreFile({ jksPath: src, keyAlias: alias, keystorePassword: storepass });
  } catch (err) {
    console.error(`Keystore illisible: ${err?.message || err}`);
    process.exit(1);
  }

  console.log(`SHA-1 : ${inspection.sha1}`);
  console.log(`SHA-256: ${inspection.sha256}`);
  if (inspection.owner) console.log(`Owner : ${inspection.owner}`);

  if (inspection.classification.kind === 'blocked') {
    console.error('\nREFUS — clé EAS interdite (E9:26:B0…). Utilisez @abdoulaye_fane__afriwonder.jks.');
    process.exit(1);
  }

  if (inspection.classification.kind === 'play-upload') {
    console.log('\nOK — clé upload Play (FA:AC:66…). AAB accepté par Google Play Console.');
  } else if (inspection.classification.kind === 'prod-app') {
    console.log('\nOK — certificat app FBF-GLOBAL (85:A5:AF…) — Firebase/OAuth.');
    console.log(`Pour Play upload, la console attend : ${PLAY_UPLOAD.sha1}`);
  } else {
    console.error(`\nREFUS — keystore inconnue.`);
    console.error(`Attendu clé upload Play : ${PLAY_UPLOAD.sha1}`);
    console.error(`Ou certificat app      : ${PROD_APP_SIGNING.sha1}`);
    console.error(`Détecté                : ${inspection.sha1}`);
    process.exit(1);
  }

  fs.copyFileSync(src, destJks);
  fs.writeFileSync(
    destCred,
    `${JSON.stringify(
      {
        android: {
          keystore: {
            keystorePath: './android-keystore.jks',
            keystorePassword: storepass,
            keyAlias: alias,
            keyPassword: keypass,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nInstallé: ${destJks}`);
  console.log(`Installé: ${destCred}`);
  console.log('\nVérifiez: npm run verify:android-signing');
}

main();
