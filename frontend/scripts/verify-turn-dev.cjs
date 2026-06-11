#!/usr/bin/env node
'use strict';

/**
 * Vérifie TURN/ICE côté backend (local ou distant) — même route que l'app mobile.
 *
 * Usage :
 *   node scripts/verify-turn-dev.cjs
 *   BACKEND_ORIGIN=http://192.168.1.11:3000 node scripts/verify-turn-dev.cjs
 *   AFW_TEST_EMAIL=... AFW_TEST_PASSWORD=... node scripts/verify-turn-dev.cjs
 */

const ORIGIN = String(process.env.BACKEND_ORIGIN || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000')
  .replace(/\/$/, '');

async function fetchJson(path, init = {}) {
  const url = `${ORIGIN}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function login() {
  const email = process.env.AFW_TEST_EMAIL?.trim();
  const password = process.env.AFW_TEST_PASSWORD?.trim();
  if (!email || !password) return null;

  const res = await fetchJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const token = res.body?.data?.accessToken || res.body?.accessToken || res.body?.token;
  return token ? String(token) : null;
}

function summarizeIceServers(iceServers) {
  if (!Array.isArray(iceServers)) return [];
  return iceServers.map((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return {
      urls: urls.filter(Boolean).map((u) => String(u).slice(0, 80)),
      hasUsername: Boolean(s.username),
      hasCredential: Boolean(s.credential),
    };
  });
}

function hasMeteredUrl(iceServers) {
  const flat = summarizeIceServers(iceServers)
    .flatMap((s) => s.urls)
    .join(' ');
  return flat.includes('metered.ca') || flat.includes('metered.live');
}

function hasTlsTurnUrl(iceServers) {
  if (!Array.isArray(iceServers)) return false;
  for (const entry of iceServers) {
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
    for (const u of urls) {
      if (String(u || '').toLowerCase().startsWith('turns:')) return true;
    }
  }
  return false;
}

async function main() {
  console.log(`\n🔍 TURN dev — origine ${ORIGIN}\n`);

  const health = await fetchJson('/health');
  if (health.status !== 200) {
    console.error(`❌ Backend injoignable (/health → HTTP ${health.status})`);
    console.error('   Démarrez : cd backend && npm run dev');
    process.exit(1);
  }
  console.log('✅ Backend /health OK');

  const anon = await fetchJson('/api/calls/turn-credentials');
  if (anon.status === 401) {
    console.log('✅ /api/calls/turn-credentials protégé (401 sans JWT)');
  } else {
    console.warn(`⚠️  turn-credentials sans auth : HTTP ${anon.status} (attendu 401)`);
  }

  const token = await login();
  if (!token) {
    console.warn('⚠️  Pas de JWT — définir AFW_TEST_EMAIL + AFW_TEST_PASSWORD pour comparer turnConfigured');
    console.log('\nCommande complète :');
    console.log('  $env:AFW_TEST_EMAIL="..."; $env:AFW_TEST_PASSWORD="..."; node scripts/verify-turn-dev.cjs');
    process.exit(0);
  }

  const proxy = await fetchJson('/api/proxy/calls/turn-credentials', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (proxy.status !== 200) {
    console.error(`❌ GET /api/proxy/calls/turn-credentials → HTTP ${proxy.status}`);
    process.exit(1);
  }

  const data = proxy.body?.data || proxy.body;
  const turnConfigured = Boolean(data?.turnConfigured);
  const iceServers = data?.iceServers || [];
  const metered = hasMeteredUrl(iceServers);

  console.log(`✅ turn-credentials authentifié (HTTP ${proxy.status})`);
  console.log(`   turnConfigured: ${turnConfigured}`);
  console.log(`   iceServers: ${iceServers.length}`);
  console.log(`   metered.ca/live: ${metered ? 'oui' : 'non'}`);
  console.log(`   realm: ${data?.realm || '(vide)'}`);
  console.log(`   ttlSec: ${data?.ttlSec ?? 0}`);

  if (!turnConfigured) {
    console.error('\n❌ turnConfigured=false — copier METERED_TURN_API_KEY (ou TURN_URL/USERNAME/CREDENTIAL) dans backend/.env');
    process.exit(1);
  }

  const tlsTurn = hasTlsTurnUrl(iceServers);
  if (!tlsTurn) {
    console.error('\n❌ Aucun relais turns: dans iceServers — les appels Android 4G (Mali) seront bloqués.');
    console.error('   Vérifiez METERED_TURN_API_KEY ou ajoutez turns:…:443?transport=tcp dans TURN_URL.');
    process.exit(1);
  }
  console.log('✅ Relais TLS turns: présent (requis Android 4G)');

  console.log('\n📋 ICE servers (résumé) :');
  for (const row of summarizeIceServers(iceServers)) {
    console.log(`   - ${row.urls.join(' | ')}${row.hasUsername ? ' [auth]' : ''}`);
  }

  console.log('\n✅ TURN prêt pour le dev mobile (même route que l\'app via /api/proxy).\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
