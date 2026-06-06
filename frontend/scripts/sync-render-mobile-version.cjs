'use strict';

/**
 * Synchronise MOBILE_ANDROID_LATEST_VERSION_CODE (et iOS) sur Render après un build EAS production.
 *
 * Secrets (machine de build / CI, jamais commités) :
 *   RENDER_API_KEY      — Render Dashboard → Account Settings → API Keys
 *   RENDER_SERVICE_ID   — srv-… (service backend) OU RENDER_SERVICE_NAME=AfriWonder
 *
 * Usage :
 *   node ./scripts/sync-render-mobile-version.cjs
 *   node ./scripts/sync-render-mobile-version.cjs --dry-run
 *   node ./scripts/sync-render-mobile-version.cjs --platform android
 */

const path = require('path');
const {
  readMobileVersionsFromAppJson,
  defaultAppJsonPath,
} = require('./lib/readMobileVersionsFromAppJson.cjs');

const RENDER_API_BASE = (process.env.RENDER_API_BASE || 'https://api.render.com/v1').replace(/\/$/, '');
const DEFAULT_SERVICE_NAME = 'AfriWonder';

function parseArgs(argv) {
  const out = { dryRun: false, platform: 'both', deploy: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--no-deploy') out.deploy = false;
    else if (a === '--platform' && argv[i + 1]) {
      out.platform = argv[++i];
    }
  }
  return out;
}

async function renderFetch(apiKey, method, urlPath, body) {
  const res = await fetch(`${RENDER_API_BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data?.message ? data.message : text || res.statusText;
    throw new Error(`Render API ${method} ${urlPath} → ${res.status}: ${msg}`);
  }
  return data;
}

async function resolveServiceId(apiKey, serviceId, serviceName) {
  if (serviceId?.trim()) return serviceId.trim();
  const name = (serviceName || DEFAULT_SERVICE_NAME).trim();
  let cursor = null;
  do {
    const qs = new URLSearchParams({ limit: '100' });
    if (cursor) qs.set('cursor', cursor);
    const page = await renderFetch(apiKey, 'GET', `/services?${qs.toString()}`);
    const rows = Array.isArray(page) ? page : page?.items ?? page?.services ?? [];
    const hit = rows.find((s) => {
      const row = s?.service ?? s;
      return row?.name === name || row?.slug === name;
    });
    if (hit) {
      const row = hit?.service ?? hit;
      if (row?.id) return row.id;
    }
    cursor = page?.cursor ?? null;
  } while (cursor);
  throw new Error(
    `Service Render "${name}" introuvable. Définissez RENDER_SERVICE_ID=srv-… (Dashboard → service → Settings).`,
  );
}

async function upsertRenderEnvVar(apiKey, serviceId, key, value) {
  try {
    return await renderFetch(apiKey, 'PUT', `/services/${serviceId}/env-vars/${encodeURIComponent(key)}`, {
      key,
      value: String(value),
    });
  } catch (err) {
    if (!String(err.message).includes('404')) throw err;
    return renderFetch(apiKey, 'POST', `/services/${serviceId}/env-vars`, [{ key, value: String(value) }]);
  }
}

async function triggerRenderDeploy(apiKey, serviceId) {
  return renderFetch(apiKey, 'POST', `/services/${serviceId}/deploys`, {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const frontendRoot = path.resolve(__dirname, '..');
  const appJsonPath = defaultAppJsonPath(frontendRoot);
  const { android, ios } = readMobileVersionsFromAppJson(appJsonPath);

  const updates = [];
  if ((args.platform === 'both' || args.platform === 'android') && android) {
    updates.push({ key: 'MOBILE_ANDROID_LATEST_VERSION_CODE', value: android });
  }
  if ((args.platform === 'both' || args.platform === 'ios') && ios) {
    updates.push({ key: 'MOBILE_IOS_LATEST_BUILD_NUMBER', value: ios });
  }

  if (updates.length === 0) {
    console.error('[sync-render] Aucun versionCode/buildNumber valide dans app.json');
    process.exit(1);
  }

  console.log('[sync-render] Versions lues depuis app.json :', { android, ios });
  console.log('[sync-render] Variables à pousser sur Render :', updates);

  if (args.dryRun) {
    console.log('[sync-render] --dry-run : aucun appel API Render.');
    return;
  }

  const apiKey = process.env.RENDER_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      '[sync-render] RENDER_API_KEY manquant. Créez une clé : Render Dashboard → Account Settings → API Keys.',
    );
    process.exit(1);
  }

  const serviceId = await resolveServiceId(
    apiKey,
    process.env.RENDER_SERVICE_ID,
    process.env.RENDER_SERVICE_NAME,
  );
  console.log('[sync-render] Service Render :', serviceId);

  for (const row of updates) {
    await upsertRenderEnvVar(apiKey, serviceId, row.key, row.value);
    console.log(`[sync-render] OK ${row.key}=${row.value}`);
  }

  if (args.deploy) {
    await triggerRenderDeploy(apiKey, serviceId);
    console.log('[sync-render] Redéploiement backend déclenché (nouvelles variables actives après deploy).');
  }

  console.log('[sync-render] Terminé.');
}

main().catch((err) => {
  console.error('[sync-render] Échec :', err.message || err);
  process.exit(1);
});
