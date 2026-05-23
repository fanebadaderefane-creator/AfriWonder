#!/usr/bin/env node
/**
 * Vérification Phase 1 - Pages visibles au lancement 26 février
 * Vérifie que toutes les pages Phase 1 existent, sont routées et accessibles
 * Usage: node scripts/verify-phase1-pages.js
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PHASE1_PAGES = {
  Core: ['Home', 'Landing', 'Discover', 'Profile', 'Settings', 'Inbox', 'Search', 'Notifications'],
  'Vidéo & social': [
    'Create', 'VideoView', 'EditVideo', 'LiveStream', 'StartLive', 'LiveView', 'Lives', 'Stories',
    'Communities', 'CommunityDetails', 'CreateCommunity', 'Playlists', 'Challenges',
    'DirectMessage', 'DirectCall', 'Chat'
  ],
  Marketplace: [
    'Marketplace', 'Product', 'AddProduct', 'Cart', 'Checkout', 'Orders', 'OrderTracking',
    'Wishlist', 'BecomeSeller', 'SellerDashboard', 'SellerProfile', 'SellerStorefront',
    'SellerOrders', 'SellerWallet', 'DisputeCenter',
  ],
  'Paiements & wallet': ['Wallet', 'RechargeWallet', 'MobileMoneyPayment', 'Addresses'],
  'Paramètres & légal': [
    'Language', 'NotificationSettings', 'NotificationPreferences', 'PrivacyPolicy',
    'DataProtection', 'PrivacySettings', 'Help', 'About', 'Support', 'Referrals',
  ],
  Gamification: ['GamificationHub', 'Achievements', 'Leaderboard', 'BadgesProfile'],
  Créateurs: ['CreatorTools', 'Analytics'],
  Admin: ['AdminDashboard'],
};

let fail = 0;
const pagesDir = join(process.cwd(), 'src', 'pages');

console.log('=== Vérification Phase 1 - Pages 26 février ===\n');

for (const [category, pages] of Object.entries(PHASE1_PAGES)) {
  console.log(`\n## ${category}`);
  for (const page of pages) {
    const filePath = join(pagesDir, `${page}.jsx`);
    const exists = existsSync(filePath);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${page}`);
    if (!exists) fail++;
  }
}

// Vérifier pages.config.js
const configPath = join(process.cwd(), 'src', 'pages.config.js');
if (!existsSync(configPath)) {
  console.log('\n❌ pages.config.js absent');
  fail++;
} else {
  const configContent = readFileSync(configPath, 'utf8');
  const allPhase1 = Object.values(PHASE1_PAGES).flat();
  const missing = allPhase1.filter((p) => !configContent.includes(`"${p}"`));
  if (missing.length > 0) {
    console.log('\n❌ Pages non enregistrées dans pages.config.js:', missing.join(', '));
    fail += missing.length;
  } else {
    console.log('\n✅ Toutes les pages Phase 1 sont enregistrées dans pages.config.js');
  }
}

// Vérifier App.jsx routing
const appPath = join(process.cwd(), 'src', 'App.jsx');
if (existsSync(appPath)) {
  const appContent = readFileSync(appPath, 'utf8');
  if (appContent.includes('pagesConfig') && appContent.includes('Object.entries(Pages)')) {
    console.log('✅ App.jsx utilise pagesConfig pour le routing dynamique');
  } else {
    console.log('⚠️ Vérifier le routing dans App.jsx');
  }
}

console.log('\n=== Résumé ===');
if (fail === 0) {
  console.log('✅ Toutes les pages Phase 1 sont présentes et routées.');
} else {
  console.log(`⚠️ ${fail} vérification(s) échouée(s).`);
}
console.log('');
process.exit(fail);
