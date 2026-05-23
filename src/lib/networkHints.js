/**
 * Détection synchrone d’un contexte « faible débit » (Mali / Afrique, data saver).
 * Utilisé par axios (sans React), les hooks réseau, et toute logique offline-first.
 *
 * Contrat Flutter : réimplémenter via connectivity_plus + capteur « données économisées » équivalent.
 */
export function isEffectiveConnectionSlow() {
  if (typeof navigator === 'undefined') return false;
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return false;
  if (c.saveData === true) return true;
  const t = c.effectiveType;
  return t === 'slow-2g' || t === '2g' || t === '3g';
}
