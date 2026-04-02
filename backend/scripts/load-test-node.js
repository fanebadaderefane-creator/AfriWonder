#!/usr/bin/env node
/**
 * Load Test Node.js (sans k6) — AfriWonder API
 *
 * Audit roadmap Phase 1 : cible indicative **≥ LOAD_TARGET_RPS** sur GET /health
 * (variable selon machine locale ; en production valider avec plusieurs workers / k6).
 *
 * Variables :
 *   API_URL          — base URL (défaut http://localhost:3000)
 *   LOAD_REQUESTS    — nombre total de requêtes (défaut 10000)
 *   LOAD_CONCURRENT  — parallélisme (défaut 200)
 *   LOAD_TARGET_RPS  — seuil succès (défaut 1000)
 *
 * Lancer :
 *   npm run load-test --prefix backend
 *   npm run load-test:1000rps --prefix backend
 * Racine : npm run test:load:1000rps
 */

import http from 'http';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TOTAL_REQUESTS = parseInt(process.env.LOAD_REQUESTS || '10000', 10);
const CONCURRENT = parseInt(process.env.LOAD_CONCURRENT || '200', 10);
const TARGET_RPS = parseInt(process.env.LOAD_TARGET_RPS || '1000', 10);

const url = new URL('/health', BASE_URL);

function request() {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        resolve({ status: res.statusCode, duration: Date.now() - start });
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function run() {
  console.log(
    `\n🔬 Load Test AfriWonder - ${TOTAL_REQUESTS} requêtes, ${CONCURRENT} concurrent (cible ${TARGET_RPS} req/s)\n`
  );

  const results = [];
  let completed = 0;
  let failed = 0;

  const batch = async () => {
    const batchSize = Math.min(CONCURRENT, TOTAL_REQUESTS - completed);
    if (batchSize <= 0) return;

    const promises = Array(batchSize)
      .fill()
      .map(async () => {
        try {
          const r = await request();
          results.push(r.duration);
          return r;
        } catch (e) {
          failed++;
          return null;
        } finally {
          completed++;
          if (completed % 50 === 0) process.stdout.write('.');
        }
      });

    await Promise.all(promises);
    if (completed < TOTAL_REQUESTS) await batch();
  };

  const start = Date.now();
  await batch();
  const totalDuration = Date.now() - start;

  const sorted = results.sort((a, b) => a - b);
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  console.log('\n\n📊 Résultats:');
  console.log(`   Requêtes: ${results.length} OK, ${failed} échecs`);
  console.log(`   Durée totale: ${(totalDuration / 1000).toFixed(2)}s`);
  const rps = results.length / (totalDuration / 1000);
  console.log(`   RPS: ${rps.toFixed(0)}`);
  console.log(`   Latence moy: ${avg.toFixed(0)}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   P99: ${p99}ms`);
  const p95Ok = p95 < 2000;
  const rpsOk = rps >= TARGET_RPS;
  console.log(`   Seuil P95 < 2000ms: ${p95Ok ? '✅ OK' : '❌ ÉCHEC'}`);
  console.log(`   Cible RPS >= ${TARGET_RPS}: ${rpsOk ? '✅ OK' : '❌ ÉCHEC'}\n`);

  if (!p95Ok || !rpsOk) {
    process.exitCode = 1;
  }
}

run().catch(console.error);
