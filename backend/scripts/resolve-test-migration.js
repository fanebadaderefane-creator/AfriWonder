/**
 * Marque une migration comme rolled back sur la DB de test.
 * Usage: node scripts/resolve-test-migration.js <migration_name>
 * Exemple: node scripts/resolve-test-migration.js 20260210_add_performance_indexes
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('❌ Usage: node scripts/resolve-test-migration.js <migration_name>');
  console.error('   Exemple: node scripts/resolve-test-migration.js 20260210_add_performance_indexes');
  process.exit(1);
}

const testEnvPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: testEnvPath });
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL non défini dans .env.test');
  process.exit(1);
}

const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log(`🔄 Résolution migration sur DB test: ${maskedUrl}\n`);

try {
  execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl, NODE_ENV: 'test' },
  });
  console.log('\n✅ Migration marquée comme rolled back sur la DB test.');
} catch (error) {
  console.error('\n❌ Erreur lors de la résolution');
  process.exit(1);
}
