/**
 * Exécute la migration manuelle CPO Wave 3 (sans psql).
 * Usage: node scripts/run-cpo-wave3-migration.js
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL manquant.');
  process.exit(1);
}

const sqlPath = join(__dirname, '..', 'prisma', 'migrations', 'RUN_MANUAL_CPO_WAVE3.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log('Exécution de RUN_MANUAL_CPO_WAVE3.sql...');
    await client.query(sql);
    console.log('✅ Migration CPO Wave 3 exécutée.');
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
