/**
 * Affiche le checksum SHA-256 (hex) des migration.sql, comme attendu par Prisma
 * pour la table _prisma_migrations (après édition d'une migration déjà appliquée).
 *
 * Usage (depuis backend/) : node scripts/print-migration-checksums.cjs
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', 'prisma', 'migrations');
const NAMES = [
  '20260208190000_ticketing_event_ticket_type_lock',
  '20260210_add_performance_indexes',
  '20260315220000_mini_app_reviews',
];

for (const name of NAMES) {
  const file = path.join(ROOT, name, 'migration.sql');
  if (!fs.existsSync(file)) {
    console.error('Missing:', file);
    continue;
  }
  const buf = fs.readFileSync(file);
  const checksum = crypto.createHash('sha256').update(buf).digest('hex');
  console.log(name);
  console.log(checksum);
  console.log('');
}
