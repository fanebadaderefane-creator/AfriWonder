/**
 * Filtre la déshydratation du cache React Query vers localStorage (safeStorage).
 * Admin / listes internes = grosses payloads → risque quota + JSON.stringify lent sur mobile (Mali).
 * Le feed, wallet, messages, etc. restent persistés normalement.
 */

/**
 * @param {{ state: { status: string }, queryKey: unknown }} query
 * @returns {boolean}
 */
export function shouldDehydrateQueryForOfflinePersist(query) {
  if (query.state.status !== 'success') return false;
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return true;
  const head = String(key[0]);
  // Toutes les clés admin / back-office observées dans le repo commencent par "admin"
  if (head.startsWith('admin')) return false;
  return true;
}
