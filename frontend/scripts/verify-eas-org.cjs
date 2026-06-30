#!/usr/bin/env node
/**
 * Vérifie que les builds EAS ciblent videovocalafriwonder (quota builds gratuits).
 *
 * Usage: cd frontend && node scripts/verify-eas-org.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ACTIVE_EAS_ORG, BLOCKED_OWNERS, BLOCKED_PROJECT_IDS } = require('./easOrgPolicy.cjs');

const FRONTEND_ROOT = path.resolve(__dirname, '..');
const EXPECTED = ACTIVE_EAS_ORG;

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
      if (new RegExp(`EXPO_PUBLIC_EXPO_ACCOUNT"\\s*:\\s*"${blockedOwner}"`).test(text)) {
        fail(`${rel} — EXPO_PUBLIC_EXPO_ACCOUNT interdit: ${blockedOwner}`);
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
  if (!pid) {
    fail('app.json projectId manquant — lancez: eas init --non-interactive --force');
  } else if (BLOCKED_PROJECT_IDS.includes(pid)) {
    fail(`app.json projectId = ${pid} (ancien org — eas init --force)`);
  } else {
    pass(`app.json projectId = ${pid}`);
  }
  return pid;
}

function checkEasJson(expectedProjectId) {
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
    if (!expectedProjectId) continue;
    if (envPid === expectedProjectId) {
      pass(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID OK`);
    } else if (!envPid) {
      fail(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID manquant — node scripts/sync-eas-project-env.cjs`);
    } else if (BLOCKED_PROJECT_IDS.includes(envPid)) {
      fail(`eas.json [${profile}] ancien projectId — node scripts/sync-eas-project-env.cjs`);
    } else if (envPid !== expectedProjectId) {
      fail(`eas.json [${profile}] EXPO_PUBLIC_EAS_PROJECT_ID incorrect: ${envPid}`);
    }
  }
}

function checkEasCliLinked(expectedProjectId) {
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
  if (expectedProjectId && id === expectedProjectId) pass(`EAS CLI project ID = ${expectedProjectId}`);
  else if (expectedProjectId && id) fail(`EAS CLI project ID = ${id} (attendu ${expectedProjectId})`);
}

console.log(`\n📦 Vérification org EAS — ${EXPECTED.label} / ${EXPECTED.slug}\n`);
console.log('━━ Fichiers locaux ━━');
const projectId = checkAppJson();
checkEasJson(projectId);
scanBlockedIds();

console.log('\n━━ Liaison EAS CLI (optionnel) ━━');
checkEasCliLinked(projectId);

console.log('\n══════════════════════════════════════════');
console.log(`  OK: ${passes.length}  |  Échecs: ${failures.length}`);
if (failures.length) {
  console.log('\n  Corrigez puis :');
  console.log('    cd frontend && eas login');
  console.log('    eas init --non-interactive --force');
  console.log('    node scripts/sync-eas-project-env.cjs');
  console.log('    npm run verify:eas-org');
  process.exit(1);
}
console.log('\n  Keystore Play (FA:AC:66…) : inchangée — npm run install:play-upload-keystore');
console.log('  Prêt pour : npm run eas:android:production');
console.log('══════════════════════════════════════════\n');
