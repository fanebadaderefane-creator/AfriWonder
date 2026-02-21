#!/usr/bin/env node
/**
 * Vérifier que le déploiement actuel (Vercel + Render) est fonctionnel
 * AVANT d’ajouter le domaine afriwonder.com.
 *
 * Si tout passe ici, afriwonder.com fonctionnera de la même façon une fois
 * le domaine configuré dans Vercel et le DNS pointé.
 *
 * Usage: node scripts/verify-production-urls.js
 */

const FRONTEND_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://afri-wonder.vercel.app';
const BACKEND_URL = process.env.RENDER_EXTERNAL_URL || 'https://afriwonder.onrender.com';

async function fetchOk(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      redirect: 'follow',
      headers: { 'User-Agent': 'AfriWonder-Verify/1.0', ...options.headers },
    });
    return { ok: res.ok, status: res.status, url: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function main() {
  console.log('=== Vérification déploiement AfriWonder (avant config afriwonder.com) ===\n');
  console.log(`Frontend (Vercel) : ${FRONTEND_URL}`);
  console.log(`Backend (Render)  : ${BACKEND_URL}\n`);

  let failed = 0;

  // 1. Backend health direct (Render)
  process.stdout.write('1. Backend Render /health … ');
  const healthBackend = await fetchOk(`${BACKEND_URL}/health`);
  if (healthBackend.ok) {
    console.log('OK');
  } else {
    console.log(`ÉCHEC (${healthBackend.status || healthBackend.error})`);
    failed++;
  }

  // 2. Frontend page (Vercel)
  process.stdout.write('2. Frontend Vercel (page d’accueil) … ');
  const home = await fetchOk(FRONTEND_URL);
  if (home.ok) {
    const html = await fetch(FRONTEND_URL).then((r) => r.text()).catch(() => '');
    const hasTitle = html.includes('AfriWonder') || html.includes('root');
    if (hasTitle) {
      console.log('OK');
    } else {
      console.log('OK (page chargée, titre non vérifié)');
    }
  } else {
    console.log(`ÉCHEC (${home.status || home.error})`);
    failed++;
  }

  // 3. Proxy API : /api via le frontend (Vercel → Render)
  // Le backend expose /health à la racine ; sous /api on teste une route publique
  process.stdout.write('3. Proxy API (Vercel /api → Render) … ');
  const apiViaProxy = await fetchOk(`${FRONTEND_URL}/api/platform/feature-flags`);
  if (apiViaProxy.ok || apiViaProxy.status === 200) {
    console.log('OK');
  } else {
    console.log(`ÉCHEC (${apiViaProxy.status || apiViaProxy.error})`);
    failed++;
  }

  // 4. Manifest PWA (téléchargement app)
  process.stdout.write('4. Manifest PWA (/manifest.webmanifest ou /manifest.json) … ');
  const manifestUrl = `${FRONTEND_URL}/manifest.webmanifest`;
  const manifest = await fetchOk(manifestUrl);
  if (manifest.ok) {
    const json = await fetch(manifestUrl).then((r) => r.json()).catch(() => ({}));
    const hasName = json.name || json.short_name;
    if (hasName) {
      console.log('OK');
    } else {
      console.log('OK (fichier présent)');
    }
  } else {
    const fallback = await fetchOk(`${FRONTEND_URL}/manifest.json`);
    if (fallback.ok) {
      console.log('OK (manifest.json)');
    } else {
      console.log(`ÉCHEC (${manifest.status || manifest.error})`);
      failed++;
    }
  }

  console.log('');
  if (failed === 0) {
    console.log('Tous les contrôles sont passés.');
    console.log('Vous pouvez configurer afriwonder.com dans Vercel : le même projet servira le site.');
    console.log('Après avoir pointé le DNS vers Vercel, afriwonder.com se comportera comme aujourd’hui.');
    process.exit(0);
  } else {
    console.log(`${failed} vérification(s) en échec. Corrigez le déploiement avant d’ajouter le domaine.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
