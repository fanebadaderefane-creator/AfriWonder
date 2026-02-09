#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend .env
const backendEnv = `DATABASE_URL="postgresql://postgres.xxxxxxxxxxxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=15"
JWT_SECRET="afriwonder_jwt_secret_key_2026_very_secure_random_string_32chars_minimum"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="afriwonder_refresh_secret_key_2026_different_from_jwt_secret_very_secure"
JWT_REFRESH_EXPIRES_IN="30d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=
ORANGE_MONEY_ENV=test
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=afriwonder-uploads
APP_URL=http://localhost:3000
`;

// Frontend .env.local
const frontendEnv = `VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_ORANGE_MERCHANT_ID=7701901162
VITE_ORANGE_API_KEY=
VITE_WS_URL=ws://localhost:3000
VITE_REACT_APP_ENV=development
`;

console.log('🚀 Configuration des fichiers .env...\n');

// Backend
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  fs.writeFileSync(backendEnvPath, backendEnv);
  console.log('✅ backend/.env créé');
} else {
  console.log('⚠️  backend/.env existe déjà');
}

// Frontend
const frontendEnvPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(frontendEnvPath)) {
  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log('✅ .env.local créé');
} else {
  console.log('⚠️  .env.local existe déjà');
}

console.log('\n📝 Prochaines étapes:');
console.log('1. Remplir DATABASE_URL dans backend/.env avec votre URL Supabase');
console.log('2. Obtenir les clés API (Stripe, Orange Money) et les ajouter');
console.log('3. cd backend && npm run dev');
console.log('4. Dans un autre terminal: npm run dev\n');

