/**
 * Script Node.js pour configurer la base de données de test
 * Usage: npm run test:setup
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Configuration de la base de données de test...\n');

// Charger les variables d'environnement depuis .env.test
const testEnvPath = path.resolve(process.cwd(), '.env.test');
const envLoaded = dotenv.config({ path: testEnvPath });

if (envLoaded.error) {
  console.error('❌ Fichier .env.test non trouvé!');
  console.log('📝 Créez .env.test à partir de .env.test.example\n');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL non défini dans .env.test');
  process.exit(1);
}

// Masquer le mot de passe dans l'affichage
const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
console.log(`📋 DATABASE_URL configuré: ${maskedUrl}\n`);

try {
  console.log('🔄 Exécution des migrations Prisma...\n');
  
  // Exécuter les migrations avec NODE_ENV=test
  execSync('cross-env NODE_ENV=test npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl },
  });
  
  console.log('\n✅ Migrations appliquées avec succès!');
  console.log('\n✅ Base de données de test configurée avec succès!');
  console.log('\n🚀 Vous pouvez maintenant exécuter les tests:');
  console.log('   npm test\n');
} catch (error) {
  console.error('\n❌ Erreur lors de l\'application des migrations');
  console.error(error.message);
  process.exit(1);
}
