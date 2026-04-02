#!/usr/bin/env node
/**
 * Vérifie la présence des artefacts attendus par les audits (dépôt uniquement).
 * Usage : node scripts/verify-audit-repo.mjs
 * CI : job verify-audit-repo
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function mustExist(rel, hint = '') {
  const p = path.join(root, ...rel.split('/'));
  if (!fs.existsSync(p)) {
    console.error(`❌ Manquant : ${rel}${hint ? ` (${hint})` : ''}`);
    return false;
  }
  console.log(`✅ ${rel}`);
  return true;
}

function fileContains(rel, needle) {
  const p = path.join(root, ...rel.split('/'));
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(needle);
}

function requireContains(rel, needle, label) {
  if (!fileContains(rel, needle)) {
    console.error(`❌ ${label || rel} → attendu : "${needle}"`);
    return false;
  }
  console.log(`✅ ${label || rel}`);
  return true;
}

let ok = true;
ok = mustExist('render.yaml') && ok;
ok = mustExist('Dockerfile.backend') && ok;
ok = mustExist('.env.example') && ok;
ok = mustExist('backend/.env.example') && ok;
ok = mustExist('flutter_app/.env.example') && ok;
ok = mustExist('sdk/afriwonder-miniapp-sdk/.env.example') && ok;
ok = mustExist('.github/workflows/deploy-render.yml') && ok;
ok = mustExist('.github/workflows/audit-artifacts.yml') && ok;
ok = mustExist('.github/workflows/detect-secrets.yml') && ok;
ok = mustExist('.secrets.baseline') && ok;
ok = mustExist('docs/ARCHITECTURE.md') && ok;
ok = mustExist('docs/AUDIT_ALIGNMENT_STATUS_2026-04-01.md') && ok;
ok = mustExist('docs/AUDIT_EXECUTION_CHECKLIST.md', 'checklist exécution audit (hors commit)') && ok;
ok = mustExist('flutter_app/lib/app/app_router.dart') && ok;
ok = mustExist('flutter_app/ios/fastlane/Fastfile') && ok;
ok = mustExist('flutter_app/android/fastlane/Fastfile') && ok;
ok = mustExist('doppler.yaml') && ok;

ok = requireContains('flutter_app/pubspec.yaml', 'flutter_riverpod', 'flutter_app/pubspec.yaml → flutter_riverpod') && ok;
ok = requireContains('flutter_app/pubspec.yaml', 'go_router', 'flutter_app/pubspec.yaml → go_router') && ok;
ok = requireContains('package.json', 'posthog-js', 'package.json → posthog-js') && ok;
ok = requireContains('backend/package.json', 'resend', 'backend/package.json → resend') && ok;
ok = requireContains('backend/package.json', 'on-headers', 'backend/package.json → on-headers') && ok;
ok = requireContains('backend/src/config/auditCompletion.ts', 'AUDIT_REPO_COMPLETION', 'auditCompletion.ts') && ok;
ok = mustExist('backend/src/schemas/highRiskBodies.ts', 'schémas Zod audit (privacy, messages, live)') && ok;
ok = mustExist('backend/src/schemas/videosCommentsAdmin.schemas.ts', 'schémas Zod vidéos, comments, admin') && ok;
ok = mustExist('backend/src/schemas/cartProductsNotifications.schemas.ts', 'schémas Zod cart, products, notifications') && ok;
ok = mustExist('backend/src/schemas/addressesAdsAirtime.schemas.ts', 'schémas Zod addresses, ads, airtime') && ok;
ok = mustExist('backend/src/schemas/jsonObjectBody.ts', 'schéma Zod corps JSON objet (fallback routes)') && ok;

if (!ok) {
  console.error('\nÉchec verify-audit-repo : compléter le dépôt ou ajuster le script.');
  process.exit(1);
}
console.log('\n✅ verify-audit-repo : OK (périmètre fichiers dépôt).');
