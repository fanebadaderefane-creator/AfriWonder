'use strict';

/**
 * Installe la keystore upload Play depuis les fichiers déjà présents dans frontend/.
 * Lit android/app/keystore.properties + @abdoulaye_fane__afriwonder.jks
 */
const fs = require('fs');
const path = require('path');
const { inspectKeystoreFile } = require('./androidKeystoreInspect.cjs');
const { isRequiredPlayUploadSigning } = require('./androidSigningPolicy.cjs');

const appRoot = path.resolve(__dirname, '..');
const propsPath = path.join(appRoot, 'android', 'app', 'keystore.properties');
const defaultJks = path.join(appRoot, '@abdoulaye_fane__afriwonder.jks');
const destJks = path.join(appRoot, 'android-keystore.jks');
const destCred = path.join(appRoot, 'credentials.json');

function parseProps(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function main() {
  if (!fs.existsSync(propsPath)) {
    console.error(`Manquant: ${propsPath}`);
    process.exit(1);
  }
  const props = parseProps(fs.readFileSync(propsPath, 'utf8'));
  const storepass = props.storePassword;
  const keypass = props.keyPassword || storepass;
  const alias = props.keyAlias;
  const rel = props.storeFile || '@abdoulaye_fane__afriwonder.jks';
  const src = path.resolve(path.join(appRoot, 'android', 'app'), rel);
  const jksPath = fs.existsSync(src) ? src : defaultJks;

  if (!fs.existsSync(jksPath)) {
    console.error(`Keystore introuvable: ${jksPath}`);
    process.exit(1);
  }
  if (!storepass || !alias) {
    console.error('keystore.properties incomplet (storePassword, keyAlias requis).');
    process.exit(1);
  }

  let inspection;
  try {
    inspection = inspectKeystoreFile({ jksPath, keyAlias: alias, keystorePassword: storepass });
  } catch (err) {
    console.error(`Keystore illisible: ${err?.message || err}`);
    process.exit(1);
  }

  console.log(`Source : ${jksPath}`);
  console.log(`SHA-1  : ${inspection.sha1}`);

  if (inspection.classification.kind === 'blocked') {
    console.error('REFUS — clé EAS interdite.');
    process.exit(1);
  }
  if (!isRequiredPlayUploadSigning(inspection.sha1)) {
    console.error('REFUS — ce n\'est pas la clé upload Play (FA:AC:66…).');
    process.exit(1);
  }

  fs.copyFileSync(jksPath, destJks);
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

  console.log('OK — clé upload Play installée pour EAS production.');
  console.log(`  ${destJks}`);
  console.log(`  ${destCred}`);
}

main();
