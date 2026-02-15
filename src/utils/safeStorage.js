/**
 * Accès sécurisé à localStorage — évite les crashs en mode privé, quota dépassé, etc.
 * Production-ready : l'app reste stable même si le stockage échoue.
 */

function safe(fn, fallback = null) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    return fn(window.localStorage);
  } catch (_e) {
    return fallback;
  }
}

export function getItem(key, fallback = null) {
  return safe((s) => s.getItem(key), fallback) ?? fallback;
}

export function setItem(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch (_e) {}
  return false;
}

export function removeItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch (_e) {}
  return false;
}

export function getJSON(key, fallback = null) {
  const raw = getItem(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    removeItem(key);
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    return setItem(key, JSON.stringify(value));
  } catch (_e) {
    return false;
  }
}
