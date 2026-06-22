#!/usr/bin/env node
/**
 * Vérifie que les builds EAS ciblent ABDOULAYEFANE AFRIWONDER PRODUCTION / AfriWonder-Production
 * (pas global-production ni fanebadaderefane dont les quotas gratuits sont épuisés).
 *
 * Usage: cd frontend && node scripts/verify-eas-org.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND_ROOT = path.resolve(__dirname, '..');

const EXPECTED = {
  owner: 'abdoulayefane-afriwonder-production',
  slug: 'afriwonder-production',
  projectId: '54406371-5aa5-4bf1-8f80-b64b9f1e72fc',
  expoAccount: 'abdoulayefane-afriwonder-production',
};

/** Anciens projets Expo — quota épuisé, ne plus utiliser pour eas build. */
const BLOCKED_PROJECT_IDS = [
  '5d875c26-f610-4105-a241-1dc03c4edcc8',
  'f4715a6b-9779-4ec1-841a-9dd7cb73e2b3',
  'fca8d6ba-0ea4-4918-8e31-3264d31de669',
];

const BLOCKED_OWNERS = ['fanebadaderefane', 'fbf-global', 'fbf_global', 'global-production'];

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  ✅ ${msg}`);
}

function fail(msg) {
  failures.push(msg);
  console.error(`  ❌ ${msg}`);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8'));
}

function scanBlockedIds() {
  const files = ['app.json', 'eas.json', 'app.config.js', 'package.json'];
  for (const rel of files) {
    const full = path.join(FRONTEND_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const blocked of BLOCKED_PROJECT_IDS) {
      if (text.includes(blocked)) fail(`${rel} contient encore l’ancien projectId ${blocked}`);
    }
    for (const blockedOwner of BLOCKED_OWNERS) {
      if (new RegExp(`"owner"\\s*:\\s*"${blockedOwner}"`).test(text)) {
        fail(`${rel} — owner interdit: ${blockedOwner}`);
      }
    }
  }
}

function checkAppJson() {
  const app = readJson('app.json').expo || {};
  if (app.owner === EXPECTED.owner) pass(`app.json owner = ${EXPECTED.owner}`);
  else fail(`app.json owner = "${app.owner || ''}" (attendu: ${EXPECTED.owner})`);

  if (app.slug === EXPECTED.slug) pass(`app.json slug = ${EXPECTED.slug}`);
  else fail(`app.json slug = "${app.slug || ''}" (attendu: ${EXPECTED.slug})`);

  const pid = app.extra?.eas?.projectId;
  if (pid === EXPECTED.projectId) pass(`app.json projectId = ${EXPECTED.projectId}`);
  else fail(`app.json projectId = "${pid || ''}" (attendu: ${EXPECTED.projectId})`);
}

function checkEasJson() {
  const eas = readJson('eas.json');
  const profiles = Object.keys(eas.build || {});
  if (!profiles.length) {
    fail('eas.json — aucun profil build');
    return;
  }
  for (const profile of profiles) {
    const env = eas.build[profile]?.env || {};
    const acct = env.EXPO_PUBLIC_EXPO_ACCOUNT;
    if (acct === EXPECTED.expoAccount) {
      pass(`eas.json [${profile}] EXPO_PUBLIC_EXPO_ACCOUNT = ${EXPECTED.expoAccount}`);
    } else {
      fail(
        `eas.json [${profile}] EXPO_PUBLIC_EXPO_ACCOUNT = "${acct || ''}" (attendu: ${EXPECTED.expoAccount})`,
      );
    }
    const envPid = env.EXPO_PUBLIC_EAS_PROJECT_ID;
    if (envPid === EXPECTED.projectId) {
      pass(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID OK`);
    } else if (!envPid) {
      fail(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID manquant`);
    } else if (envPid !== EXPECTED.projectId) {
      fail(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID incorrect: ${envPid}`);
    }
  }
}

function checkEasCliLinked() {
  if (!spawnSync('eas', ['--version'], { shell: true, stdio: 'pipe' }).stdout) {
    console.warn('  ⚠️  eas-cli absent — skip eas project:info (npm i -g eas-cli)');
    return;
  }
  const r = spawnSync('eas', ['project:info', '--json'], {
    cwd: FRONTEND_ROOT,
    shell: true,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.warn('  ⚠️  eas project:info échoué — lancez `eas login` puis réessayez');
    return;
  }
  let info;
  try {
    info = JSON.parse(r.stdout);
  } catch {
    const match = r.stdout.match(/@([\w-]+)\/([\w-]+)/);
    if (match) {
      const [, owner, slug] = match;
      if (owner === EXPECTED.owner && slug === EXPECTED.slug) {
        pass(`EAS CLI lié à @${owner}/${slug}`);
      } else {
        fail(`EAS CLI lié à @${owner}/${slug} (attendu @${EXPECTED.owner}/${EXPECTED.slug})`);
      }
      return;
    }
    console.warn('  ⚠️  eas project:info — JSON illisible');
    return;
  }
  const fullName = String(info.fullName || info.name || '');
  const id = String(info.id || info.projectId || '');
  if (fullName.includes(`@${EXPECTED.owner}/${EXPECTED.slug}`) || fullName === `@${EXPECTED.owner}/${EXPECTED.slug}`) {
    pass(`EAS CLI project: ${fullName}`);
  } else if (fullName) {
    fail(`EAS CLI project: ${fullName} (attendu @${EXPECTED.owner}/${EXPECTED.slug})`);
  }
  if (id === EXPECTED.projectId) pass(`EAS CLI project ID = ${EXPECTED.projectId}`);
  else if (id) fail(`EAS CLI project ID = ${id} (attendu ${EXPECTED.projectId})`);
}

console.log('\n📦 Vérification org EAS — ABDOULAYEFANE AFRIWONDER PRODUCTION / AfriWonder-Production\n');
console.log('━━ Fichiers locaux ━━');
checkAppJson();
checkEasJson();
scanBlockedIds();

console.log('\n━━ Liaison EAS CLI (optionnel) ━━');
checkEasCliLinked();

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  Échecs: ${failures.length}`);
if (failures.length) {
  console.log('\n  Les builds `eas build` iraient vers le mauvais projet ou échoueraient (quota FBF).');
  console.log('  Corrigez app.json / eas.json puis : eas init --id 54406371-5aa5-4bf1-8f80-b64b9f1e72fc');
  process.exit(1);
}
console.log('\n  Prêt pour : npm run eas:android:callDiagnostic');
console.log('              npm run eas:android:production  (AAB Play Store)');
console.log('══════════════════════════════════════════\n');
