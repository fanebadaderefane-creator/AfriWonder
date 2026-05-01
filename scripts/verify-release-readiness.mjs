#!/usr/bin/env node
/**
 * Contrôles techniques pré-release : version package vs CHANGELOG.
 * Ne remplace pas les paliers 5%→100% (process release) — garde-fou local/CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const pkgPath = path.join(root, 'package.json');
const changelogPath = path.join(root, 'CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
if (!version || typeof version !== 'string') {
  console.error('package.json: version manquante ou invalide.');
  process.exit(1);
}

if (!fs.existsSync(changelogPath)) {
  console.error('CHANGELOG.md introuvable à la racine.');
  process.exit(1);
}

const cl = fs.readFileSync(changelogPath, 'utf8');
const patterns = [
  new RegExp(`##\\s*\\[?${version.replace(/\./g, '\\.')}\\]?`, 'm'),
  new RegExp(`version\\s*${version.replace(/\./g, '\\.')}`, 'i'),
  new RegExp(`v${version.replace(/\./g, '\\.')}\\b`, 'i'),
];

const ok = patterns.some((re) => re.test(cl));
if (!ok) {
  console.error(
    `Release readiness: la version ${version} du package.json n'apparaît pas dans CHANGELOG.md (ajoutez une entrée).`,
  );
  process.exit(1);
}

console.log(`[verify-release-readiness] OK — version ${version} référencée dans CHANGELOG.md.`);
