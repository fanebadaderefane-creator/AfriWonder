/**
 * k6 — charge feed vidéo (brief v2).
 * Usage : k6 run -e API_URL=https://afri-wonder.vercel.app -e TOKEN=... tests/load/afriwonder-feed.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    feed_smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const base = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  const headers = {};
  if (__ENV.TOKEN) {
    headers.Authorization = `Bearer ${__ENV.TOKEN}`;
  }
  const res = http.get(`${base}/api/videos?limit=10`, { headers });
  check(res, { 'feed 2xx': (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
