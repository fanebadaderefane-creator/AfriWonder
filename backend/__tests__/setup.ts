/**
 * Setup global pour les tests Jest
 * Configure la base de données de test et exécute les migrations
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { beforeAll, afterAll } from '@jest/globals';

// Charger les variables d'environnement de test
const testEnvPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: testEnvPath });

// Fallback sur .env si .env.test n'existe pas
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables. Créez .env.test avec DATABASE_URL.');
}

// Créer le client Prisma pour les tests
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: [], // Pas de logs en tests
});

// Exporter prisma pour utilisation dans les tests
(global as any).__PRISMA__ = prisma;

// Setup avant tous les tests
beforeAll(async () => {
  // Connecter à la base de données
  await prisma.$connect();
  
  // Vérifier que la connexion fonctionne
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connexion à la base de données de test réussie');
  } catch (error: any) {
    console.error('❌ Erreur de connexion à la base de données de test:', error);
    console.error('💡 Vérifiez que:');
    console.error('   1. La base de données afriwonder_test existe');
    console.error('   2. Les migrations sont appliquées (npm run test:db)');
    console.error('   3. Les credentials dans .env.test sont corrects');
    throw error;
  }

  // Créer l'utilisateur plateforme (pour ledger/platform services)
  const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID || '00000000-0000-0000-0000-000000000000';
  try {
    await prisma.user.upsert({
      where: { id: PLATFORM_USER_ID },
      update: {},
      create: {
        id: PLATFORM_USER_ID,
        email: 'platform@afriwonder.app',
        username: 'platform',
        password_hash: 'no-login',
        full_name: 'AfriWonder Platform',
        role: 'admin',
      },
    });
    console.log('✅ Utilisateur plateforme créé/vérifié');
  } catch (err: any) {
    console.warn('⚠️ Erreur création utilisateur plateforme (peut être ignoré si déjà existant):', err.message);
  }
});

// Teardown après tous les tests
afterAll(async () => {
  // Déconnecter
  await prisma.$disconnect();
  await pool.end();
});

export { prisma };
