#!/usr/bin/env node
/**
 * Test décisif TURN : login + GET /api/proxy/calls/turn-credentials
 * Usage: node scripts/test-turn-credentials-decisive.mjs
 */
const ORIGIN = (process.env.BACKEND_ORIGIN || 'https://afriwonder.onrender.com').replace(/\/+$/, '');
const EMAIL = process.env.AFW_TEST_EMAIL || 'abdoulayefane813@gmail.com';
const PASSWORD = process.env.AFW_TEST_PASSWORD || 'Mali@2025';
const STATIC_USERNAME_PREFIX = (process.env.TURN_USERNAME || '707ac69357e7083ddec37d19').slice(0, 5);

async function postJson(path, body) {
  const res = await fetch(`${ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

async function getJson(path, token) {
  const res = await fetch(`${ORIGIN}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json };
}

function classifyUsername(username) {
  const u = String(username || '');
  if (!u) return 'absent';
  if (u.startsWith(STATIC_USERNAME_PREFIX) && u.length === 24) return 'statique (TURN_USERNAME Render)';
  if (/^\d{10}:/.test(u)) return 'dynamique (Metered API — expiry:userId)';
  if (u.includes(':')) return 'dynamique (format timestamp ou HMAC)';
  return 'autre format';
}

async function main() {
  console.log(`\n=== Test décisif TURN — ${ORIGIN} ===\n`);
  console.log(`Login: ${EMAIL}\n`);

  const login = await postJson('/api/proxy/auth/login', { email: EMAIL, password: PASSWORD });
  const token =
    login.json?.data?.accessToken ||
    login.json?.data?.token ||
    login.json?.accessToken ||
    login.json?.token;

  if (!token) {
    console.error('LOGIN ÉCHEC', login.status, JSON.stringify(login.json, null, 2));
    process.exit(1);
  }
  console.log(`LOGIN OK (HTTP ${login.status}), JWT obtenu (${String(token).slice(0, 12)}…)\n`);

  const creds = await getJson('/api/proxy/calls/turn-credentials', token);
  if (creds.status !== 200) {
    console.error('TURN-CREDENTIALS ÉCHEC', creds.status, JSON.stringify(creds.json, null, 2));
    process.exit(1);
  }

  const data = creds.json?.data || creds.json;
  const urls = Array.isArray(data?.urls) ? data.urls : [];
  const username = String(data?.username || '');
  const iceServers = Array.isArray(data?.iceServers) ? data.iceServers : [];

  console.log('--- Résultat GET /api/proxy/calls/turn-credentials ---\n');
  console.log('turnConfigured:', data?.turnConfigured);
  console.log('username (5 premiers car.):', username.slice(0, 5) || '(vide)');
  console.log('username type:', classifyUsername(username));
  console.log('realm:', data?.realm || '(vide)');
  console.log('ttlSec:', data?.ttlSec);
  console.log('expiresAt:', data?.expiresAt);
  console.log('\nURLs TURN (data.urls):');
  urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));

  console.log('\niceServers count:', iceServers.length);
  for (let i = 0; i < iceServers.length; i++) {
    const s = iceServers[i];
    const u = s?.urls;
    const list = Array.isArray(u) ? u : u ? [u] : [];
    const isTurn = list.some((x) => String(x).startsWith('turn'));
    console.log(`  [${i}] ${isTurn ? 'TURN' : 'STUN'} urls=${JSON.stringify(list)} hasAuth=${Boolean(s?.username && s?.credential)}`);
  }

  const hasGlobalRelay = urls.some((u) => String(u).includes('global.relay.metered.ca'));
  const hasEuWest1Relay = urls.some((u) => String(u).includes('eu-west-1.relay.metered.ca'));
  const hasEuCentral1Relay = urls.some((u) => String(u).includes('eu-central-1.relay.metered.ca'));
  console.log('\n--- Analyse ---');
  console.log('turnRegion:', data?.turnRegion || '(non exposé — backend ancien)');
  console.log('turnRelayHosts:', data?.turnRelayHosts || []);
  console.log('Contient eu-west-1.relay.metered.ca (Irlande / Maroc↔Mali):', hasEuWest1Relay ? 'OUI ✓' : 'NON ✗');
  console.log('Contient eu-central-1.relay.metered.ca:', hasEuCentral1Relay ? 'OUI ✓' : 'NON ✗');
  console.log('Contient global.relay.metered.ca (repli):', hasGlobalRelay ? 'OUI' : 'NON');
  if (!hasEuWest1Relay && !hasEuCentral1Relay && hasGlobalRelay) {
    console.warn('\n⚠️  TURN encore sur global seul — ajoutez METERED_TURN_REGION=afriwonder sur Render et redéployez le backend.');
  }
  console.log(
    'Branche probable:',
    username.startsWith(STATIC_USERNAME_PREFIX) && data?.expiresAt === 0
      ? 'Fallback statique (TURN_URL Render)'
      : data?.expiresAt > 0
        ? 'API Metered (METERED_TURN_API_KEY)'
        : 'indéterminé',
  );

  console.log('\n(JSON complet sans credential — copie diagnostic)\n');
  const safe = { ...data, credential: data?.credential ? '[REDACTED]' : '', iceServers: iceServers.map((s) => ({ ...s, credential: s.credential ? '[REDACTED]' : undefined })) };
  console.log(JSON.stringify({ success: creds.json?.success, data: safe }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
