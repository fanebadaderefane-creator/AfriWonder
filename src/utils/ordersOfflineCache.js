/**
 * Cache local des commandes pour mode offline / faible connexion (Afrique).
 * Stocke la dernière liste chargée dans localStorage avec expiration.
 */
const CACHE_KEY = 'afriwonder_orders_cache';
const CACHE_META_KEY = 'afriwonder_orders_cache_meta';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_ORDERS = 50;

export function getCachedOrders() {
  try {
    if (!window.localStorage) return null;
    const meta = JSON.parse(localStorage.getItem(CACHE_META_KEY) || 'null');
    if (!meta || !meta.timestamp) return null;
    if (Date.now() - meta.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_META_KEY);
      return null;
    }
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.orders ? { orders: data.orders, pagination: data.pagination || {}, fromCache: true } : null;
  } catch {
    return null;
  }
}

export function setCachedOrders(result) {
  try {
    if (!window.localStorage || !result?.orders) return;
    const orders = Array.isArray(result.orders) ? result.orders.slice(0, MAX_ORDERS) : [];
    localStorage.setItem(CACHE_KEY, JSON.stringify({ orders, pagination: result.pagination || {} }));
    localStorage.setItem(CACHE_META_KEY, JSON.stringify({ timestamp: Date.now() }));
  } catch {
    // ignore
  }
}

export function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine === true;
}
