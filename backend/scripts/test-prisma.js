import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Create a .env file or set the variable.');
  process.exit(1);
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    console.log('Testing Prisma connection...');
    
    // Test simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Prisma works! User count: ${userCount}`);
    
    // Test legal tables exist
    try {
      const legalDocs = await prisma.legalDocument.count();
      console.log(`✅ Legal tables exist! Document count: ${legalDocs}`);
    } catch (e) {
      console.log('ℹ️ Legal tables not yet populated (normal if first time)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
