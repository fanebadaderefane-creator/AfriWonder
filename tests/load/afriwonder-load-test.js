/**
 * k6 — scénarios de charge (phases 7 & contrat audit).
 *
 * Par défaut : **profil léger** (10 VUs, 1 min) pour ne pas saturer la prod par accident.
 *
 * Exemples :
 *   k6 run tests/load/afriwonder-load-test.js
 *   k6 run -e API_URL=http://localhost:3000 tests/load/afriwonder-load-test.js
 *   k6 run -e K6_PROFILE=medium -e API_URL=https://staging.example.com tests/load/afriwonder-load-test.js
 *   k6 run -e K6_PROFILE=stress -e K6_MAX_VUS=200 -e API_URL=https://staging.example.com tests/load/afriwonder-load-test.js
 *
 * ⚠️ Ne lancez K6_PROFILE=stress contre la prod sans accord ops.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = (__ENV.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const profile = __ENV.K6_PROFILE || 'smoke';
const maxVusCap = Math.min(Number(__ENV.K6_MAX_VUS || 500), 10000);

function pickScenarios() {
  if (profile === 'stress') {
    const t1 = Math.min(100, maxVusCap);
    const t2 = Math.min(500, maxVusCap);
    return {
      stress_ramp: {
        executor: 'ramping-vus',
        startVUs: 0,
        stages: [
          { duration: '30s', target: t1 },
          { duration: '2m', target: t2 },
          { duration: '1m', target: t2 },
          { duration: '30s', target: 0 },
        ],
      },
    };
  }
  if (profile === 'medium') {
    return {
      medium: {
        executor: 'constant-vus',
        vus: Math.min(50, maxVusCap),
        duration: '2m',
      },
    };
  }
  return {
    smoke: {
      executor: 'constant-vus',
      vus: Math.min(10, maxVusCap),
      duration: '1m',
    },
  };
}

export const options = {
  scenarios: pickScenarios(),
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const h = {};
  if (__ENV.TOKEN) {
    h.Authorization = `Bearer ${__ENV.TOKEN}`;
  }

  const health = http.get(`${base}/api/health`, { headers: h });
  check(health, { 'health 2xx': (r) => r.status >= 200 && r.status < 300 });

  const feed = http.get(`${base}/api/videos?limit=5`, { headers: h });
  check(feed, { 'videos 2xx': (r) => r.status >= 200 && r.status < 300 });

  sleep(Number(__ENV.K6_SLEEP_SEC || 0.5));
}
