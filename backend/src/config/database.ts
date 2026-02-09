import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

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

// Connect to database (only in non-test environment)
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
  // En mode test, se connecter silencieusement
  prisma.$connect().catch(() => {
    // Ignorer les erreurs de connexion en mode test
  });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
});

export default prisma;

