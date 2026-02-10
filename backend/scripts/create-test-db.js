/**
 * Script pour créer la base de données de test si elle n'existe pas
 * Usage: node scripts/create-test-db.js
 */
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger .env.test
const testEnvPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: testEnvPath });

// Fallback sur .env
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL non défini (définir dans .env.test ou dans l’environnement, ex. CI)');
  process.exit(1);
}

// Extraire les informations de connexion
// Format: postgresql://user:password@host:port/database
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);

if (!urlMatch) {
  console.error('❌ Format DATABASE_URL invalide');
  process.exit(1);
}

const [, user, password, host, port, databaseWithQuery] = urlMatch;
const database = databaseWithQuery ? databaseWithQuery.split('?')[0] : 'afriwonder_test';

console.log(`🔧 Création de la base de données de test: ${database}`);
console.log(`📋 Host: ${host}:${port}`);

// Créer une connexion au serveur PostgreSQL (sans spécifier la DB)
const adminPool = new Pool({
  host,
  port: parseInt(port),
  user,
  password: decodeURIComponent(password),
  database: 'postgres', // Se connecter à la DB par défaut
});

try {
  // Vérifier si la DB existe déjà
  const checkResult = await adminPool.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [database]
  );

  if (checkResult.rows.length > 0) {
    console.log(`✅ La base de données "${database}" existe déjà`);
  } else {
    // Créer la DB
    await adminPool.query(`CREATE DATABASE "${database}"`);
    console.log(`✅ Base de données "${database}" créée avec succès`);
  }

  await adminPool.end();
  
  console.log('\n🚀 Vous pouvez maintenant exécuter les migrations:');
  console.log('   npm run test:db\n');
} catch (error) {
  console.error('\n❌ Erreur lors de la création de la base de données:', error.message);
  
  if (error.message.includes('does not exist')) {
    console.error('\n💡 Vérifiez que:');
    console.error('   1. PostgreSQL/Supabase est accessible');
    console.error('   2. Les credentials dans .env.test sont corrects');
    console.error('   3. Vous avez les permissions pour créer des bases de données');
  }
  
  await adminPool.end();
  process.exit(1);
}
