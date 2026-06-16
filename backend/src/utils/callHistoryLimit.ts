/** Limite GET /api/calls/history — bornée pour mobile Afrique (payload léger). */
export function parseCallHistoryLimit(raw: unknown, defaultLimit = 20, maxLimit = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return defaultLimit;
  return Math.min(maxLimit, Math.max(1, Math.floor(n)));
}
