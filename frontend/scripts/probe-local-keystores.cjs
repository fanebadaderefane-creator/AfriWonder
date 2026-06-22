'use strict';

const fs = require('fs');
const path = require('path');
const { inspectKeystoreFile } = require('./androidKeystoreInspect.cjs');
const { PROD_APP_SIGNING } = require('./androidSigningPolicy.cjs');

const appRoot = path.resolve(__dirname, '..');
const cred = JSON.parse(fs.readFileSync(path.join(appRoot, 'credentials.json'), 'utf8'));
const k = cred.android?.keystore || {};

const candidates = [
  path.join(appRoot, 'android-keystore.jks'),
  path.join(appRoot, 'android', 'app', 'release.keystore'),
  path.join(appRoot, 'android', 'app', 'debug.keystore'),
];

const tries = [
  { alias: k.keyAlias, storepass: k.keystorePassword, label: 'credentials.json' },
  { alias: 'afriwonder', storepass: k.keystorePassword, label: 'alias afriwonder' },
  { alias: 'upload', storepass: k.keystorePassword, label: 'alias upload' },
  { alias: 'key0', storepass: k.keystorePassword, label: 'alias key0' },
  { alias: 'androiddebugkey', storepass: 'android', label: 'debug default' },
];

for (const jksPath of candidates) {
  if (!fs.existsSync(jksPath)) continue;
  console.log(`\n=== ${jksPath} ===`);
  for (const t of tries) {
    if (!t.alias || !t.storepass) continue;
    try {
      const info = inspectKeystoreFile({
        jksPath,
        keyAlias: t.alias,
        keystorePassword: t.storepass,
      });
      const ok = info.sha1 === PROD_APP_SIGNING.sha1 ? ' *** PROD FBF-GLOBAL ***' : '';
      console.log(`  [${t.label}] alias=${t.alias} SHA-1=${info.sha1}${ok}`);
      if (info.owner) console.log(`    owner: ${info.owner.slice(0, 80)}`);
    } catch {
      /* wrong password/alias */
    }
  }
}
