/**
 * k6 Load Test - AfriWonder API
 * Prérequis: installer k6 (https://k6.io/docs/get-started/installation/)
 * Lancer: k6 run backend/scripts/load-test.k6.js
 *
 * Scénarios: smoke (10 VU), load (100 VU), stress (1000 VU)
 * Pour 1M users simulation: k6 run --vus 5000 --duration 5m (ajuster selon infra)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '0s',
      exec: 'smokeTest',
    },
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      startTime: '35s',
      exec: 'loadTest',
    },
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      startTime: '6m',
      exec: 'stressTest',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% des requêtes < 2s
    http_req_failed: ['rate<0.01'],     // < 1% d'échecs
  },
};

export function smokeTest() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { 'health OK': (r) => r.status === 200 });
  sleep(0.5);

  const ready = http.get(`${BASE_URL}/health/ready`);
  check(ready, { 'ready OK': (r) => r.status === 200 });
  sleep(0.5);

  const products = http.get(`${BASE_URL}/api/products?page=1&limit=10`);
  check(products, { 'products OK': (r) => r.status === 200 });
  sleep(1);
}

export function loadTest() {
  smokeTest();
  const live = http.get(`${BASE_URL}/api/live?page=1&limit=10`);
  check(live, { 'live OK': (r) => r.status === 200 });
  sleep(0.3);

  const feed = http.get(`${BASE_URL}/api/feed?page=1&limit=20`);
  check(feed, { 'feed OK': (r) => r.status === 200 });
  sleep(0.2);

  const adsFeed = http.get(`${BASE_URL}/api/ads/feed?limit=5`);
  check(adsFeed, { 'ads/feed OK': (r) => r.status === 200 });
  sleep(0.2);

  const platform = http.get(`${BASE_URL}/api/platform/feature-flags`);
  check(platform, { 'platform OK': (r) => r.status === 200 });
  sleep(0.5);
}

export function stressTest() {
  loadTest();
}
