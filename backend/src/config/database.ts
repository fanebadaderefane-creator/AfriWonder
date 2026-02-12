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
    dotenv.config({ path: resolvedEnvPath, override: true });
  } else {
    dotenv.config({ override: true });
  }
} else {
  dotenv.config();
}

// Créer le pool de connexions PostgreSQL
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({ connectionString });
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
