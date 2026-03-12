// AfriWonder full review PR - CodeRabbit
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

if (process.env.NODE_ENV === 'test') {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const envCandidates = [
    path.resolve(process.cwd(), '.env.test'),
    path.resolve(process.cwd(), 'backend', '.env.test'),
    path.resolve(currentDir, '..', '..', '.env.test'),
  ];
  const resolvedEnvPath = envCandidates.find((p) => fs.existsSync(p));
  if (resolvedEnvPath) {
    // override: false pour préserver JWT_SECRET/JWT_REFRESH_SECRET du script test (ex. test:ads)
    dotenv.config({ path: resolvedEnvPath, override: false });
  } else {
    dotenv.config({ override: false });
  }
} else {
  dotenv.config();
}

// Créer le pool de connexions PostgreSQL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Pool size: avec Supabase/Supavisor en Session mode (port 5432), le pooler limite les connexions
// (erreur MaxClientsInSessionMode). Garder un petit pool (2–5) pour ne pas saturer.
const connectionStringLower = (connectionString || '').toLowerCase();
const isPoolerSession = /pooler\.|supabase\.com|supavisor/i.test(connectionStringLower);

const poolMaxEnv = parseInt(process.env.DATABASE_POOL_MAX || '', 10);
const poolMax = Number.isFinite(poolMaxEnv) && poolMaxEnv > 0
  ? Math.min(poolMaxEnv, 100)
  : isPoolerSession
    ? 3
    : (process.env.NODE_ENV === 'production' ? 20 : 10);

const pool = new Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 30s pour éviter timeout lors de l'init (politiques de rétention, etc.)
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : process.env.NODE_ENV === 'test'
    ? []
    : ['error'],
});

// Connect to database (only in non-test environment; never exit in test)
if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => {
      logger.info('✅ Database connected');
    })
    .catch((error) => {
      logger.error('❌ Database connection failed', error);
      process.exit(1);
    });
} else {
  // En mode test : pas de process.exit, connexion gérée par __tests__/setup.ts
  prisma.$connect().catch(() => {});
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
});

export default prisma;
