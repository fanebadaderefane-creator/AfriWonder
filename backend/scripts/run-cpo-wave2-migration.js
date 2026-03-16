/**
 * Exécute la migration manuelle CPO Wave 2 sans psql (Windows / pas de client PostgreSQL installé).
 * Usage: node scripts/run-cpo-wave2-migration.js
 * Ou:    npm run db:migrate:cpo-wave2
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL manquant. Définissez-la dans .env');
  process.exit(1);
}

const sqlPath = join(__dirname, '..', 'prisma', 'migrations', 'RUN_MANUAL_CPO_WAVE2.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log('Exécution de RUN_MANUAL_CPO_WAVE2.sql...');
    await client.query(sql);
    console.log('✅ Migration CPO Wave 2 exécutée.');
  } catch (err) {
    console.error('Erreur:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
