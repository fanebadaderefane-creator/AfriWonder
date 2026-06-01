#!/usr/bin/node
/**
 * Audit couverture flux léger (forfait mobile) sur Render :
 * - GET /api/mobile/health → video_delivery / capabilities
 * - GET /api/feed (échantillon) → low_quality_playback_url par vidéo
 *
 * Usage:
 *   node frontend/scripts/verify-low-quality-coverage-prod.cjs
 *   BACKEND_ORIGIN=https://afriwonder.onrender.com node frontend/scripts/verify-low-quality-coverage-prod.cjs
 */
const ORIGIN = (process.env.BACKEND_ORIGIN || 'https://afriwonder.onrender.com').replace(/\/+$/, '');

async function fetchJson(path) {
  const res = await fetch(`${ORIGIN}${path}`, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`\n🔍 Audit flux léger (forfait) — ${ORIGIN}\n`);

  const health = await fetchJson('/api/mobile/health');
  if (health.status !== 200) {
    console.error(`❌ /api/mobile/health — HTTP ${health.status}`);
    process.exit(1);
  }

  const caps = health.body?.data?.capabilities || {};
  const vd = health.body?.data?.video_delivery;
  const pct = caps.video_low_quality_coverage_pct;

  if (pct == null && !vd) {
    console.warn('⚠️  video_delivery absent — déployer le backend avec videoLowQualityCoverage.service.ts');
  } else {
    console.log(`✅ Couverture DB flux léger : ${pct ?? vd?.coverage_pct ?? '?'}%`);
    console.log(`   Niveau alerte : ${vd?.alert_level ?? '?'}`);
    console.log(`   HD seulement (DB) : ${vd?.hd_only ?? '?'}`);
    if (Array.isArray(vd?.alerts) && vd.alerts.length) {
      for (const a of vd.alerts) console.warn(`   ⚠️  ${a}`);
    }
    if (caps.video_data_saver_ok === true) {
      console.log('✅ video_data_saver_ok=true');
    } else if (caps.video_data_saver_ok === false) {
      console.error('❌ video_data_saver_ok=false — risque plaintes forfait');
    }
  }

  const feed = await fetchJson('/api/feed?page=1&limit=20');
  if (feed.status !== 200) {
    console.warn(`⚠️  /api/feed — HTTP ${feed.status} (skip échantillon feed)`);
    process.exit(vd?.alert_level === 'critical' ? 1 : 0);
  }

  const items = feed.body?.data?.items || feed.body?.data?.videos || feed.body?.data || [];
  const list = Array.isArray(items) ? items : [];
  let videoCount = 0;
  let withLow = 0;
  let hdOnly = 0;

  for (const row of list) {
    const v = row?.video || row;
    if (!v || typeof v !== 'object') continue;
    const url = String(v.video_url || v.videoUrl || '').trim();
    if (!url) continue;
    videoCount += 1;
    const low = String(v.low_quality_playback_url || v.low_quality_url || '').trim();
    if (low) withLow += 1;
    else hdOnly += 1;
  }

  if (videoCount === 0) {
    console.warn('⚠️  Feed sans vidéos dans l’échantillon');
  } else {
    const feedPct = Math.round((withLow / videoCount) * 1000) / 10;
    console.log(`\n📺 Échantillon feed (${videoCount} vidéos) :`);
    console.log(`   Avec flux léger : ${withLow}/${videoCount} (${feedPct}%)`);
    console.log(`   HD seulement   : ${hdOnly}/${videoCount}`);
    if (feedPct < 70) {
      console.error('❌ Feed majoritairement HD — utilisateurs forfait impactés');
      process.exit(1);
    }
    if (hdOnly > 0) {
      console.warn(`⚠️  ${hdOnly} vidéo(s) du feed actuel sans low_quality_playback_url`);
    } else {
      console.log('✅ Échantillon feed 100% flux léger');
    }
  }

  console.log('\n--- Résumé ---');
  if ((pct ?? 100) >= 90 && hdOnly === 0) {
    console.log('Audit OK — forfait mobile bien protégé sur cet échantillon.');
    process.exit(0);
  }
  if ((pct ?? 0) >= 70) {
    console.log('Audit partiel — compléter les rendus manquants (admin backfill).');
    process.exit(0);
  }
  console.log('Audit CRITIQUE — lancer POST /api/admin/videos/low-quality-coverage/backfill');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
