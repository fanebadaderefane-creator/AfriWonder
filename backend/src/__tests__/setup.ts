/**
 * Setup global pour les tests Jest
 * Configure la base de données de test et exécute les migrations
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { beforeAll, afterAll } from '@jest/globals';

// Charger les variables d'environnement de test de facon robuste
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envCandidates = [
  path.resolve(process.cwd(), '.env.test'),
  path.resolve(process.cwd(), 'backend', '.env.test'),
  path.resolve(currentDir, '..', '..', '.env.test'),
];

const resolvedEnvPath = envCandidates.find((p) => fs.existsSync(p));
if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath, override: true });
} else {
  // Fallback ultime: .env standard
  dotenv.config({ override: true });
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
});

// Teardown après tous les tests
afterAll(async () => {
  // Déconnecter
  await prisma.$disconnect();
  await pool.end();
});

export { prisma };
