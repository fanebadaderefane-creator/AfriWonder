/**
 * Script pour appliquer les migrations sur la DB de test
 * Charge automatiquement .env.test
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

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

// Masquer le mot de passe dans l'affichage
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log(`🔄 Application des migrations sur: ${maskedUrl}\n`);

try {
  // Exécuter les migrations avec DATABASE_URL depuis .env.test
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl, NODE_ENV: 'test' },
  });
  
  console.log('\n✅ Migrations appliquées avec succès!');
} catch (error) {
  console.error('\n❌ Erreur lors de l\'application des migrations');
  process.exit(1);
}
