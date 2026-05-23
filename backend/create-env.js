#!/usr/bin/env node

/**
 * Script pour créer automatiquement le fichier .env
 * avec toutes les clés Supabase configurées
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envContent = `# ============================================
# AFRI CONNECT - Backend Configuration Supabase
# ============================================
# Configuration complète avec toutes les clés Supabase
# Généré automatiquement le ${new Date().toISOString()}
# ============================================

# ============================================
# DATABASE (Supabase)
# ============================================
# URL Supabase: https://tlgpcoeadjhitwirfgrb.supabase.co
# Project Ref: tlgpcoeadjhitwirfgrb
# Mot de passe: Mali@202520211215
# ============================================
# Format Session Pooler (port 5432 - Compatible IPv4) - RECOMMANDÉ
DATABASE_URL="postgresql://postgres.tlgpcoeadjhitwirfgrb:Mali%40202520211215@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"

# Format Direct (port 5432) - Non compatible IPv4
# DATABASE_URL="postgresql://postgres:Mali%40202520211215@db.tlgpcoeadjhitwirfgrb.supabase.co:5432/postgres"

# ============================================
# JWT AUTHENTICATION
# ============================================
# Secret généré aléatoirement (32 bytes base64)
JWT_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko="
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="BaIr/jOjyZGmQaN3PoxBl8VBH/mDRN4mgoP+++xA4Ko=REFRESH"
JWT_REFRESH_EXPIRES_IN="30d"

# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# CORS
# ============================================
# PWA + Expo web (Metro) — ports typiques 5173 / 8081 / 8082
CORS_ORIGIN=http://localhost:5173,http://localhost:8081,http://localhost:8082

# ============================================
# SUPABASE API
# ============================================
# URL Supabase
SUPABASE_URL=https://tlgpcoeadjhitwirfgrb.supabase.co
# API Key (Anon Key)
SUPABASE_ANON_KEY=sb_publishable_6fK4ds91_MCfP60plDLO5A_K5EItLCw

# ============================================
# EMAIL (SendGrid)
# ============================================
# À configurer plus tard
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@afriwonder.app

# ============================================
# SOCIAL AUTHENTICATION
# ============================================
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback

# Apple — Sign in with Apple (mobile Expo : POST /api/auth/oauth/apple)
# Audience JWT = bundle iOS (ex. com.afriwonder.app) ou Services ID si vous l’utilisez à la place
APPLE_IOS_CLIENT_ID=com.afriwonder.app
APPLE_CLIENT_ID=

# ============================================
# PAYMENTS
# ============================================
# Orange Money
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
ORANGE_MONEY_MERCHANT_ID=7701901162
ORANGE_MONEY_API_KEY=
ORANGE_MONEY_ENV=test

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# FILE STORAGE (S3 / Cloudflare R2)
# ============================================
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=afriwonder-uploads

# ============================================
# PUSH NOTIFICATIONS
# ============================================
FCM_SERVER_KEY=
FCM_PROJECT_ID=

# ============================================
# MONITORING (Optionnel)
# ============================================
SENTRY_DSN=

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

const envPath = join(__dirname, '.env');

try {
  writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Fichier .env créé avec succès !');
  console.log(`📁 Emplacement: ${envPath}`);
  console.log('\n🔑 Clés Supabase configurées:');
  console.log('   - DATABASE_URL');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_ANON_KEY');
  console.log('   - JWT_SECRET');
  console.log('   - JWT_REFRESH_SECRET');
  console.log('\n🚀 Prochaines étapes:');
  console.log('   1. cd backend');
  console.log('   2. npm install');
  console.log('   3. npm run db:generate');
  console.log('   4. npm run db:migrate');
  console.log('   5. npm run dev');
} catch (error) {
  console.error('❌ Erreur lors de la création du fichier .env:', error.message);
  process.exit(1);
}

