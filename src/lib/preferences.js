/**
 * Persistance des préférences utilisateur (localStorage).
 * Production-ready : aucune donnée perdue après fermeture, restauration au démarrage.
 * Utilise safeStorage pour éviter les crashs (mode privé, quota).
 */

import { getJSON, setJSON } from '@/utils/safeStorage';

const PREFERENCES_KEY = 'afw_preferences';

const DEFAULTS = {
  isMuted: true,
  language: 'fr',
};

/**
 * Charge les préférences depuis le stockage local.
 * @returns {Object} Préférences (fusionnées avec les défauts)
 */
export function loadPreferences() {
  const stored = getJSON(PREFERENCES_KEY);
  if (!stored || typeof stored !== 'object') return { ...DEFAULTS };
  return { ...DEFAULTS, ...stored };
}

/**
 * Enregistre les préférences (merge avec l'existant).
 * @param {Partial<Object>} patch - Clés à mettre à jour
 * @returns {boolean} Succès
 */
export function savePreferences(patch) {
  if (!patch || typeof patch !== 'object') return false;
  const current = loadPreferences();
  const next = { ...current, ...patch };
  return setJSON(PREFERENCES_KEY, next);
}

export { DEFAULTS };
