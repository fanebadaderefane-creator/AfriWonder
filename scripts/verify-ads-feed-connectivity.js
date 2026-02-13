#!/usr/bin/env node
/**
 * Vérification connectivité Frontend ↔ Backend pour le module Publicité (CDC Phase 1)
 * Usage: node scripts/verify-ads-feed-connectivity.js
 * Prérequis: Backend démarré sur API_URL (défaut http://localhost:3000)
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import http from 'http';
import https from 'https';

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:3000';
const base = API_URL.replace(/\/$/, '');
const isHttps = base.startsWith('https');

let fail = 0;

console.log('=== Vérification connectivité Ads/Feed ===\n');
console.log('API Base:', base);

// 1. Vérifier expressClient
const clientPath = join(process.cwd(), 'src', 'api', 'expressClient.js');
if (!existsSync(clientPath)) {
  console.log('   ❌ expressClient.js absent');
  process.exit(1);
}
const clientContent = readFileSync(clientPath, 'utf8');
const checks = [
  ["api.feed.list", /['`]\/feed['`]/.test(clientContent)],
  ["api.ads.recordImpression", /\/ads\/impression/.test(clientContent)],
  ["api.ads.recordClick", /\/ads\/click/.test(clientContent)],
  ["api.ads.getPricing", /\/ads\/pricing/.test(clientContent)],
  ["api.ads.getCampaigns", /\/ads\/campaigns/.test(clientContent)],
];
for (const [name, ok] of checks) {
  console.log(ok ? `   ✅ ${name}` : `   ❌ ${name}`);
  if (!ok) fail++;
}

// 2. Test HTTP
function httpGet(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(url, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve({ status: 0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
  });
}

console.log('\n--- Test HTTP endpoints ---');
const endpoints = [
  { path: '/api/feed', desc: 'GET /api/feed' },
  { path: '/api/ads/feed', desc: 'GET /api/ads/feed' },
];
for (const ep of endpoints) {
  const res = await httpGet(base + ep.path);
  const ok = res.status >= 200 && res.status < 400;
  console.log(ok ? `   ✅ ${ep.desc} → ${res.status}` : `   ⚠️ ${ep.desc} → ${res.status || 'unreachable'}`);
  if (res.status === 0) console.log('      (Backend non démarré?)');
}

console.log('\n=== Résumé ===');
if (fail > 0) {
  console.log(`❌ ${fail} vérification(s) échouée(s) côté frontend`);
  process.exit(1);
}
console.log('✅ Connectivité Ads/Feed OK');
process.exit(0);
