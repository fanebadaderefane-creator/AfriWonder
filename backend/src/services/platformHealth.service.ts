/**
 * Platform Health — indicateurs temps réel pour le Centre de Contrôle.
 * Données agrégées / métriques (users online via présence, transactions, erreurs, etc.)
 */

import prisma from '../config/database.js';
import { getErrorsSummary } from './errorMonitoring.service.js';
import { getHttpMetricsSummary } from './httpMetrics.service.js';
import e2eeService from './e2ee.service.js';
import { getVideoLowQualityCoverageCached } from './videoLowQualityCoverage.service.js';

// Cache court pour éviter de surcharger la DB
let cache: {
  data: Record<string, unknown> | null;
  at: number;
} = { data: null, at: 0 };
const CACHE_MS = 10_000; // 10s

async function getHealthUncached(): Promise<{
  status: 'stable' | 'degraded' | 'critical';
  users_online: number;
  transactions_last_minute: number;
  failed_payments_last_hour: number;
  error_rate_5m: number;
  api_latency_p95_ms: number | null;
  server_load_note: string;
  e2ee: {
    devices_registered: number;
    prekeys_available: number;
    envelopes_last_hour: number;
    healthy: boolean;
    alerts: string[];
  };
  video_delivery: {
    coverage_pct: number;
    alert_level: string;
    hd_only: number;
    alerts: string[];
  } | null;
  timestamp: string;
}> {
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [usersOnlineCount, txLastMin, failedPaymentsLastHour, errorsSummary, e2ee, videoCoverage] =
    await Promise.all([
    prisma.userPresence.count({ where: { is_online: true } }).catch(() => 0),
    prisma.transaction.count({
      where: { created_at: { gte: oneMinAgo } },
    }).catch(() => 0),
    prisma.transaction.count({
      where: {
        created_at: { gte: oneHourAgo },
        status: 'failed',
      },
    }).catch(() => 0),
    Promise.resolve(getErrorsSummary()),
    e2eeService.getHealthSnapshot().catch(() => ({
      devices_registered: 0,
      prekeys_available: 0,
      envelopes_last_hour: 0,
      envelopes_last_day: 0,
      healthy: false,
      alerts: ['e2ee_snapshot_unavailable'],
      timestamp: new Date().toISOString(),
    })),
    getVideoLowQualityCoverageCached().catch(() => null),
  ]);

  const errorRate5m = errorsSummary?.countLast24h ? Math.min(1, errorsSummary.countLast24h / 100) : 0;
  const apiLatencyP95 = getHttpMetricsSummary().p95_ms;

  let status: 'stable' | 'degraded' | 'critical' = 'stable';
  if (errorRate5m > 0.1 || failedPaymentsLastHour > 50) status = 'degraded';
  if (errorRate5m > 0.3 || failedPaymentsLastHour > 200) status = 'critical';
  if (status === 'stable' && !e2ee.healthy) status = 'degraded';
  if (e2ee.alerts.includes('no_devices_registered') || e2ee.alerts.includes('prekeys_low')) {
    status = status === 'critical' ? 'critical' : 'degraded';
  }
  if (videoCoverage && videoCoverage.alert_level === 'critical') {
    status = status === 'critical' ? 'critical' : 'degraded';
  }

  return {
    status,
    users_online: usersOnlineCount,
    transactions_last_minute: txLastMin,
    failed_payments_last_hour: failedPaymentsLastHour,
    error_rate_5m: errorRate5m,
    api_latency_p95_ms: apiLatencyP95,
    server_load_note: process.env.NODE_ENV === 'production' ? 'Check metrics server' : 'Local',
    e2ee: {
      devices_registered: e2ee.devices_registered,
      prekeys_available: e2ee.prekeys_available,
      envelopes_last_hour: e2ee.envelopes_last_hour,
      healthy: e2ee.healthy,
      alerts: e2ee.alerts,
    },
    video_delivery: videoCoverage
      ? {
          coverage_pct: videoCoverage.coverage_pct,
          alert_level: videoCoverage.alert_level,
          hd_only: videoCoverage.hd_only,
          alerts: videoCoverage.alerts,
        }
      : null,
    timestamp: now.toISOString(),
  };
}

export async function getPlatformHealth() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) {
    return cache.data as Awaited<ReturnType<typeof getHealthUncached>>;
  }
  const data = await getHealthUncached();
  cache = { data, at: Date.now() };
  return data;
}
