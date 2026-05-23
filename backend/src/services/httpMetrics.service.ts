type RouteKey = string;

type RouteStat = {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
  recentLatencies: number[];
};

const MAX_RECENT_LATENCIES = 500;
const MAX_ROUTE_KEYS = 300;

const startedAt = Date.now();
const routes = new Map<RouteKey, RouteStat>();

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function getRouteKey(method: string, path: string): RouteKey {
  return `${method.toUpperCase()} ${path || '/'}`;
}

export function recordHttpMetric(input: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}) {
  const key = getRouteKey(input.method, input.path);
  if (!routes.has(key) && routes.size >= MAX_ROUTE_KEYS) {
    // prevent unbounded memory in case of very dynamic paths
    const firstKey = routes.keys().next().value;
    if (firstKey) routes.delete(firstKey);
  }

  const route = routes.get(key) || {
    count: 0,
    errors: 0,
    totalMs: 0,
    maxMs: 0,
    recentLatencies: [],
  };

  route.count += 1;
  if (input.statusCode >= 400) route.errors += 1;
  route.totalMs += input.durationMs;
  route.maxMs = Math.max(route.maxMs, input.durationMs);
  route.recentLatencies.push(input.durationMs);
  if (route.recentLatencies.length > MAX_RECENT_LATENCIES) {
    route.recentLatencies.shift();
  }

  routes.set(key, route);
}

export function getHttpMetricsSummary() {
  let totalRequests = 0;
  let totalErrors = 0;
  const allRecent: number[] = [];
  const byRoute: Array<{
    route: string;
    count: number;
    errors: number;
    error_rate: number;
    avg_ms: number;
    p95_ms: number | null;
    max_ms: number;
  }> = [];

  for (const [route, stat] of routes.entries()) {
    totalRequests += stat.count;
    totalErrors += stat.errors;
    allRecent.push(...stat.recentLatencies);
    byRoute.push({
      route,
      count: stat.count,
      errors: stat.errors,
      error_rate: stat.count > 0 ? Number((stat.errors / stat.count).toFixed(4)) : 0,
      avg_ms: stat.count > 0 ? Number((stat.totalMs / stat.count).toFixed(2)) : 0,
      p95_ms: percentile(stat.recentLatencies, 95),
      max_ms: Number(stat.maxMs.toFixed(2)),
    });
  }

  byRoute.sort((a, b) => b.count - a.count);

  return {
    uptime_sec: Math.floor((Date.now() - startedAt) / 1000),
    total_requests: totalRequests,
    total_errors: totalErrors,
    error_rate: totalRequests > 0 ? Number((totalErrors / totalRequests).toFixed(4)) : 0,
    p95_ms: percentile(allRecent, 95),
    top_routes: byRoute.slice(0, 25),
    recent_latencies_ms: allRecent.slice(-1000),
  };
}

export function resetHttpMetricsForTests() {
  routes.clear();
}

