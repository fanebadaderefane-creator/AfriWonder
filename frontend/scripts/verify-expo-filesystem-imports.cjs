'use strict';

/**
 * Expo SDK 54+ : `expo-file-system` (racine) lève sur getInfoAsync / readAsStringAsync.
 * L’upload vidéo doit importer `expo-file-system/legacy` uniquement.
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const roots = [
  path.join(frontendRoot, 'app'),
  path.join(frontendRoot, 'src'),
];
const badImport = /from\s+['"]expo-file-system['"]/;
let failed = false;

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === '.git') continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx)$/.test(name.name)) acc.push(full);
  }
  return acc;
}

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8');
    if (badImport.test(text)) {
      console.error(`[verify:expo-fs] FAIL: import racine interdit → ${path.relative(frontendRoot, file)}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log('[verify:expo-fs] OK — expo-file-system/legacy uniquement (upload vidéo).');
