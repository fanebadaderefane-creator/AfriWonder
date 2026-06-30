'use strict';

/**
 * Copie owner + projectId depuis app.json vers eas.json (tous les profils build).
 * À lancer après : eas init --non-interactive --force
 */
const fs = require('fs');
const path = require('path');
const { ACTIVE_EAS_ORG, BLOCKED_PROJECT_IDS } = require('./easOrgPolicy.cjs');

const appRoot = path.resolve(__dirname, '..');
const appJsonPath = path.join(appRoot, 'app.json');
const easJsonPath = path.join(appRoot, 'eas.json');

function main() {
  const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8')).expo || {};
  const eas = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  const owner = app.owner;
  const projectId = app.extra?.eas?.projectId;

  if (owner !== ACTIVE_EAS_ORG.owner) {
    console.error(`app.json owner = "${owner || ''}" (attendu ${ACTIVE_EAS_ORG.owner})`);
    process.exit(1);
  }
  if (!projectId || BLOCKED_PROJECT_IDS.includes(projectId)) {
    console.error('projectId manquant ou ancien org. Lancez :');
    console.error('  cd frontend');
    console.error('  eas login');
    console.error('  eas init --non-interactive --force');
    console.error('  node scripts/sync-eas-project-env.cjs');
    process.exit(1);
  }

  let updated = 0;
  for (const profile of Object.keys(eas.build || {})) {
    const env = eas.build[profile].env || (eas.build[profile].env = {});
    env.EXPO_PUBLIC_EXPO_ACCOUNT = ACTIVE_EAS_ORG.expoAccount;
    env.EXPO_PUBLIC_EAS_PROJECT_ID = projectId;
    updated += 1;
  }
  fs.writeFileSync(easJsonPath, `${JSON.stringify(eas, null, 2)}\n`);
  console.log(`OK — ${updated} profil(s) eas.json → ${ACTIVE_EAS_ORG.expoAccount} / ${projectId}`);
}

main();
