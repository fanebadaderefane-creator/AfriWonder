#!/usr/bin/env node
/**
 * Vérification des modules de persistance AfriWonder.
 * Usage: node scripts/verify-persistence.js
 * Vérifie que les modules critiques (preferences, safeStorage, persistence-registry) existent.
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

const files = [
  ['src/utils/safeStorage.js', 'safeStorage (localStorage sécurisé)'],
  ['src/lib/preferences.js', 'preferences (préférences persistées)'],
  ['src/lib/query-client.js', 'query-client (React Query + persister)'],
  ['src/lib/persistence-registry.js', 'persistence-registry (registre central)'],
  ['src/contexts/PreferencesContext.jsx', 'PreferencesContext'],
  ['src/services/offlineStorage.service.js', 'offlineStorage (IndexedDB)'],
];

let ok = 0;
let fail = 0;

console.log('\n=== Vérification modules persistance AfriWonder ===\n');

for (const [rel, desc] of files) {
  const p = join(ROOT, rel);
  if (existsSync(p)) {
    console.log(`  ✅ ${desc}`);
    ok++;

    // Vérifications supplémentaires
    if (rel.includes('query-client')) {
      const content = readFileSync(p, 'utf8');
      if (content.includes('queryPersister') && content.includes('createSyncStoragePersister')) {
        console.log('      → Persister React Query (offline-first)');
      }
      if (content.includes('afw_react_query_cache')) {
        console.log('      → Clé cache afw_react_query_cache');
      }
    }
  } else {
    console.log(`  ❌ ${desc} manquant (${rel})`);
    fail++;
  }
}

console.log(`\n  Total: ${ok} OK, ${fail} échec(s)\n`);
process.exit(fail > 0 ? 1 : 0);
