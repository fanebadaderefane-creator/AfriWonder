'use strict';

/**
 * Télécharge la keystore Android depuis EAS (ancien ou nouveau projet) vers
 * frontend/android-keystore.jks + met à jour credentials.json — sans prompt interactif.
 */
const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const credPath = path.join(appRoot, 'credentials.json');
const jksPath = path.join(appRoot, 'android-keystore.jks');
const packageName = 'com.afriwonder.app';

const PROJECT_CANDIDATES = [
  { account: 'global-production', projectName: 'afriwonder-production', label: 'global-production (keystore prod historique)' },
  { account: 'fanebadaderefane', projectName: 'afriwonder-production', label: 'fanebadaderefane (legacy)' },
  { account: 'videovocalafriwonder', projectName: 'afriwonder-production', label: 'videovocalafriwonder (org active)' },
  { account: 'abdoulayefane-afriwonder-production', projectName: 'afriwonder-production', label: 'abdoulayefane (quota épuisé)' },
];

function resolveEasCliRoot() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'eas-cli'),
    path.join(process.env.ProgramFiles || '', 'nodejs', 'node_modules', 'eas-cli'),
  ];
  for (const dir of candidates) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) return dir;
  }
  try {
    return path.dirname(require.resolve('eas-cli/package.json'));
  } catch {
    throw new Error('eas-cli introuvable — installez: npm install -g eas-cli');
  }
}

function readExpoSessionSecret() {
  const statePath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.expo', 'state.json');
  if (!fs.existsSync(statePath)) {
    throw new Error(`Session Expo absente (${statePath}). Lancez: eas login`);
  }
  const auth = JSON.parse(fs.readFileSync(statePath, 'utf8'))?.auth;
  const sessionSecret = auth?.sessionSecret;
  if (!sessionSecret) {
    throw new Error('Non connecté à Expo. Lancez: eas login');
  }
  return sessionSecret;
}

function loadEasModules() {
  const root = resolveEasCliRoot();
  const req = (rel) => require(path.join(root, rel));
  return {
    createGraphqlClient: req('build/commandUtils/context/contextUtils/createGraphqlClient').createGraphqlClient,
    getDefaultAndroidAppBuildCredentialsAsync:
      req('build/credentials/android/api/GraphqlClient').getDefaultAndroidAppBuildCredentialsAsync,
    getLegacyAndroidAppBuildCredentialsAsync:
      req('build/credentials/android/api/GraphqlClient').getLegacyAndroidAppBuildCredentialsAsync,
    formatProjectFullName: req('build/credentials/android/api/GraphqlClient').formatProjectFullName,
  };
}

async function fetchKeystoreFromProject(graphqlClient, eas, candidate) {
  const appLookup = {
    account: { name: candidate.account },
    projectName: candidate.projectName,
    androidApplicationIdentifier: packageName,
  };
  const fullName = `@${candidate.account}/${candidate.projectName}`;
  console.log(`[sync-keystore] Essai EAS @${fullName} (${candidate.label})…`);

  let buildCredentials =
    (await eas.getDefaultAndroidAppBuildCredentialsAsync(graphqlClient, appLookup)) ||
    (await eas.getLegacyAndroidAppBuildCredentialsAsync(graphqlClient, appLookup));

  const keystore = buildCredentials?.androidKeystore;
  if (!keystore?.keystore) {
    console.log(`[sync-keystore]   → pas de keystore sur ${fullName}`);
    return null;
  }
  console.log(`[sync-keystore]   → keystore trouvée (alias ${keystore.keyAlias})`);
  return { candidate, keystore };
}

function writeLocalKeystore(keystore) {
  fs.writeFileSync(jksPath, Buffer.from(keystore.keystore, 'base64'));

  const cred = {
    android: {
      keystore: {
        keystorePath: './android-keystore.jks',
        keystorePassword: keystore.keystorePassword,
        keyAlias: keystore.keyAlias,
        keyPassword: keystore.keyPassword ?? keystore.keystorePassword,
      },
    },
  };
  fs.writeFileSync(credPath, `${JSON.stringify(cred, null, 2)}\n`);
  console.log(`[sync-keystore] OK écrit: ${jksPath}`);
  console.log(`[sync-keystore] OK écrit: ${credPath}`);
}

async function main() {
  const { inspectKeystoreBuffer, scoreKeystoreForProduction, formatProductionHint } = require('./androidKeystoreInspect.cjs');

  const sessionSecret = process.env.EXPO_TOKEN ? null : readExpoSessionSecret();
  const eas = loadEasModules();
  const graphqlClient = eas.createGraphqlClient({
    accessToken: process.env.EXPO_TOKEN || null,
    sessionSecret,
  });

  const found = [];
  for (const candidate of PROJECT_CANDIDATES) {
    try {
      const row = await fetchKeystoreFromProject(graphqlClient, eas, candidate);
      if (!row) continue;
      let inspection = null;
      try {
        inspection = inspectKeystoreBuffer(row.keystore.keystore, row.keystore);
        console.log(`[sync-keystore]   → SHA-1 ${inspection.sha1} (${inspection.classification.label || inspection.classification.kind})`);
      } catch (err) {
        console.warn(`[sync-keystore]   → empreinte illisible: ${err?.message || err}`);
      }
      found.push({ ...row, inspection, score: scoreKeystoreForProduction(inspection) });
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(`[sync-keystore]   → erreur ${candidate.label}: ${msg}`);
    }
  }

  found.sort((a, b) => b.score - a.score);
  const best = found.find((row) => row.score > 0) || found[0];

  if (!best?.keystore) {
    console.error('\n[sync-keystore] ÉCHEC — keystore absente sur EAS (tous projets).');
    console.error('              Placez manuellement android-keystore.jks (prod FBF-GLOBAL) + credentials.json');
    process.exit(1);
  }

  if (best.score <= 0) {
    console.error('\n[sync-keystore] ÉCHEC — aucune keystore prod / Play upload trouvée sur EAS.');
    console.error('              Les keystores distantes sont des clés auto-générées (rejet Play).');
    console.error('              Copiez votre .jks prod localement ou uploadez via: eas credentials -p android');
    process.exit(1);
  }

  console.log(`[sync-keystore] Sélection : @${best.candidate.account}/${best.candidate.projectName}`);
  console.log(`[sync-keystore] ${formatProductionHint(best.inspection.sha1)}`);
  writeLocalKeystore(best.keystore);
}

main().catch((err) => {
  console.error('[sync-keystore] Erreur:', err?.message || err);
  process.exit(1);
});
