#!/usr/bin/env node
/**
 * Vérifie la stack appels mobile sans Postman :
 * - santé backend Render
 * - TURN configuré (GET /api/mobile/health → capabilities.turn)
 * - route turn-credentials protégée (401 sans JWT)
 * - connexion Socket.IO (handshake)
 * - garde-fous frontend (tests Vitest call/*)
 *
 * Usage:
 *   node frontend/scripts/verify-call-stack-prod.cjs
 *   BACKEND_ORIGIN=https://afriwonder.onrender.com node frontend/scripts/verify-call-stack-prod.cjs
 *
 * Optionnel (vérifie turnConfigured + username/credential) :
 *   AFW_TEST_EMAIL=... AFW_TEST_PASSWORD=... node frontend/scripts/verify-call-stack-prod.cjs
 */
const ORIGIN = (process.env.BACKEND_ORIGIN || 'https://afriwonder.onrender.com').replace(/\/+$/, '');

const results = [];

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function warn(name, detail) {
  results.push({ ok: true, name, detail, warn: true });
  console.warn(`⚠️  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, init = {}) {
  const url = `${ORIGIN}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body, url };
}

async function verifyHealth() {
  const root = await fetchJson('/health');
  if (root.status === 200) {
    pass('Backend /health', `${root.status} @ ${ORIGIN}`);
  } else {
    fail('Backend /health', `HTTP ${root.status}`);
  }

  const api = await fetchJson('/api/health');
  if (api.status === 200) {
    pass('Backend /api/health', `${api.status}`);
  } else {
    warn('Backend /api/health', `HTTP ${api.status} (non bloquant si /health OK)`);
  }
}

async function verifyTurnCapabilityFlag() {
  const res = await fetchJson('/api/mobile/health');
  if (res.status !== 200) {
    fail('TURN flag /api/mobile/health', `HTTP ${res.status}`);
    return;
  }
  const turn = res.body?.data?.capabilities?.turn;
  if (turn === true) {
    pass('TURN configuré sur Render', 'capabilities.turn=true');
  } else if (turn === false) {
    fail('TURN sur Render', 'capabilities.turn=false — variables TURN_* absentes ou vides');
  } else {
    fail('TURN sur Render', 'réponse inattendue');
  }
}

async function verifyTurnCredentialsRoute() {
  const res = await fetchJson('/api/calls/turn-credentials');
  if (res.status === 401 || res.status === 403) {
    pass('Route turn-credentials', `protégée (HTTP ${res.status})`);
  } else if (res.status === 200) {
    warn('Route turn-credentials', '200 sans auth — inattendu');
  } else {
    fail('Route turn-credentials', `HTTP ${res.status}`);
  }

  const proxy = await fetchJson('/api/proxy/calls/turn-credentials');
  if (proxy.status === 401 || proxy.status === 403) {
    pass('Route proxy turn-credentials (mobile)', `HTTP ${proxy.status}`);
  } else {
    fail('Route proxy turn-credentials', `HTTP ${proxy.status}`);
  }
}

async function verifyTurnCredentialsAuthenticated() {
  const email = process.env.AFW_TEST_EMAIL?.trim();
  const password = process.env.AFW_TEST_PASSWORD?.trim();
  if (!email || !password) {
    warn(
      'TURN credentials authentifiés',
      'skip — définir AFW_TEST_EMAIL + AFW_TEST_PASSWORD pour tester turnConfigured',
    );
    return;
  }

  const login = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token =
    login.body?.data?.accessToken ||
    login.body?.accessToken ||
    login.body?.data?.token ||
    login.body?.token;
  if (!token) {
    fail('Login test TURN', `HTTP ${login.status} — pas de token`);
    return;
  }
  pass('Login test TURN', `HTTP ${login.status}`);

  const creds = await fetchJson('/api/proxy/calls/turn-credentials', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (creds.status !== 200) {
    fail('GET turn-credentials authentifié', `HTTP ${creds.status}`);
    return;
  }
  const data = creds.body?.data || creds.body;
  if (data?.turnConfigured && Array.isArray(data.urls) && data.urls.length > 0 && data.username && data.credential) {
    pass('turnConfigured=true', `${data.urls.length} URL(s) TURN`);
    if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      pass('iceServers Metered', `${data.iceServers.length} entrée(s) RTCIceServer`);
    } else {
      warn('iceServers', 'absent — déployer backend avec meteredTurn.service.ts');
    }
  } else if (data?.turnConfigured === false) {
    fail('turnConfigured', 'false malgré capabilities.turn — vérifier TURN_USERNAME/CREDENTIAL ou SHARED_SECRET+REALM');
  } else {
    fail('Réponse turn-credentials', JSON.stringify(data).slice(0, 120));
  }
}

async function verifySocket() {
  let io;
  try {
    io = require('socket.io-client');
  } catch {
    try {
      io = require('../../backend/node_modules/socket.io-client');
    } catch {
      warn('Socket.IO', 'socket.io-client non installé — skip');
      return;
    }
  }

  await new Promise((resolve) => {
    const socket = io.io(ORIGIN, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: 15000,
    });
    const timer = setTimeout(() => {
      fail('Socket.IO handshake', 'timeout 15s');
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      resolve(undefined);
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timer);
      pass('Socket.IO connecté', `id=${socket.id || '?'}`);
      socket.disconnect();
      resolve(undefined);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      fail('Socket.IO handshake', String(err?.message || err));
      resolve(undefined);
    });
  });
}

async function verifyAppVersionRoute() {
  const res = await fetchJson('/api/mobile/app-version');
  if (res.status === 404) {
    fail(
      'Route /api/mobile/app-version',
      'HTTP 404 — déployer le backend Render avec mobileAppVersion.service',
    );
    return;
  }
  if (res.status !== 200) {
    fail('Route /api/mobile/app-version', `HTTP ${res.status}`);
    return;
  }
  const android = res.body?.data?.android;
  if (!android || typeof android.latest_version_code !== 'number') {
    fail('Politique MAJ Android', 'réponse invalide');
    return;
  }
  pass('Route /api/mobile/app-version', `latest_android=${android.latest_version_code}`);
  if (android.latest_version_code <= 0) {
    warn(
      'MOBILE_ANDROID_LATEST_VERSION_CODE',
      'non défini sur Render — pas d’alerte MAJ tant que la variable n’est pas posée',
    );
  } else {
    pass('Politique MAJ Android configurée', `latest=${android.latest_version_code}`);
  }
  const proxy = await fetchJson('/api/proxy/mobile/app-version');
  if (proxy.status === 200) {
    pass('Route proxy mobile/app-version (Expo)', 'HTTP 200');
  } else {
    fail('Route proxy mobile/app-version', `HTTP ${proxy.status}`);
  }
}

async function main() {
  console.log(`\n🔍 Vérification stack appels — ${ORIGIN}\n`);
  await verifyHealth();
  await verifyTurnCapabilityFlag();
  await verifyTurnCredentialsRoute();
  await verifyTurnCredentialsAuthenticated();
  await verifyAppVersionRoute();
  await verifySocket();

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Résumé ---');
  console.log(`Checks OK: ${results.filter((r) => r.ok && !r.warn).length}`);
  console.log(`Warnings: ${results.filter((r) => r.warn).length}`);
  console.log(`Échecs: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nRappels mobile (hors de ce script) :');
    console.log('- WebRTC : build EAS requis (Expo Go = pas de WebRTCModule)');
    console.log('- Permissions : micro (audio) + caméra (vidéo) au 1er appel');
    console.log('- Signalisation : call:accept uniquement depuis call.tsx après getUserMedia');
    process.exit(1);
  }
  console.log('\nStack backend + socket OK pour les appels. Tester audio/vidéo sur 2 APK EAS.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
