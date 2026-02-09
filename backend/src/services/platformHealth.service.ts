/**
 * Platform Health — indicateurs temps réel pour le Centre de Contrôle.
 * Données agrégées / métriques (users online via présence, transactions, erreurs, etc.)
 */

import prisma from '../config/database.js';
import { getErrorsSummary } from './errorMonitoring.service.js';

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
  timestamp: string;
}> {
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [usersOnlineCount, txLastMin, failedPaymentsLastHour, errorsSummary] = await Promise.all([
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
  ]);

  const errorRate5m = errorsSummary?.countLast24h ? Math.min(1, errorsSummary.countLast24h / 100) : 0;
  const apiLatencyP95: number | null = null;

  let status: 'stable' | 'degraded' | 'critical' = 'stable';
  if (errorRate5m > 0.1 || failedPaymentsLastHour > 50) status = 'degraded';
  if (errorRate5m > 0.3 || failedPaymentsLastHour > 200) status = 'critical';

  return {
    status,
    users_online: usersOnlineCount,
    transactions_last_minute: txLastMin,
    failed_payments_last_hour: failedPaymentsLastHour,
    error_rate_5m: errorRate5m,
    api_latency_p95_ms: apiLatencyP95,
    server_load_note: process.env.NODE_ENV === 'production' ? 'Check metrics server' : 'Local',
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
