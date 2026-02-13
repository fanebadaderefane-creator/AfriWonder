/**
 * k6 Load Test - Feed & Ads (CDC Phase 1)
 * Usage: k6 run scripts/load-test-feed.k6.js
 * API_URL=http://localhost:3000 k6 run scripts/load-test-feed.k6.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.API_URL || 'http://localhost:3000';

export const options = {
  scenarios: {
    feed_smoke: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      exec: 'feedSmoke',
    },
    feed_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 0 },
      ],
      startTime: '35s',
      exec: 'feedLoad',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
  },
};

export function feedSmoke() {
  const feed = http.get(`${BASE}/api/feed?page=1&limit=20`);
  check(feed, { 'feed 200': (r) => r.status === 200 });
  sleep(0.5);

  const ads = http.get(`${BASE}/api/ads/feed?limit=10`);
  check(ads, { 'ads/feed 200': (r) => r.status === 200 });
  sleep(0.5);
}

export function feedLoad() {
  feedSmoke();
  const impression = http.post(
    `${BASE}/api/ads/impression`,
    JSON.stringify({ creative_id: 'load-test', campaign_id: 'load-test' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(impression, { 'impression': (r) => r.status === 200 || r.status === 404 });
  sleep(0.3);
}
