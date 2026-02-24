/**
 * Persistance des préférences utilisateur (localStorage).
 * Production-ready : aucune donnée perdue après fermeture, restauration au démarrage.
 * Utilise safeStorage pour éviter les crashs (mode privé, quota).
 */

import { getJSON, setJSON } from '@/utils/safeStorage';

const PREFERENCES_KEY = 'afw_preferences';

const DEFAULTS = {
  isMuted: false,
  soundPreferenceSet: false,
  language: 'fr',
};

/**
 * Charge les préférences depuis le stockage local.
 * @returns {Object} Préférences (fusionnées avec les défauts)
 */
export function loadPreferences() {
  const stored = getJSON(PREFERENCES_KEY);
  if (!stored || typeof stored !== 'object') return { ...DEFAULTS };
  const merged = { ...DEFAULTS, ...stored };
  if (!merged.soundPreferenceSet) {
    merged.isMuted = false;
  }
  return merged;
}

/**
 * Enregistre les préférences (merge avec l'existant).
 * @param {Partial<Object>} patch - Clés à mettre à jour
 * @returns {boolean} Succès
 */
export function savePreferences(patch) {
  if (!patch || typeof patch !== 'object') return false;
  const current = loadPreferences();
  const normalizedPatch = { ...patch };
  if (Object.prototype.hasOwnProperty.call(normalizedPatch, 'isMuted')) {
    normalizedPatch.soundPreferenceSet = true;
  }
  const next = { ...current, ...normalizedPatch };
  return setJSON(PREFERENCES_KEY, next);
}

export { DEFAULTS };
