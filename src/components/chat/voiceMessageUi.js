/**
 * UI vocaux type WhatsApp — constantes + helpers purs (facile à ajuster / tester).
 * La piste utilise une grille N colonnes égales : progress01, la pastille et les barres
 * partagent la même origine mathématique (évite le décalage avec justify-between).
 */

export const VOICE_UI = {
  barCount: 54,
  /** Padding horizontal de la piste (px) — doit correspondre au style du conteneur */
  trackPadPx: 4,
  /** Hauteur utile de la zone onde (px) */
  trackHeightPx: 18,
  barMinHeightPx: 2,
  /** Facteur * h (0–1) → hauteur barre max compacte type WhatsApp */
  barHeightScalePx: 12,
  /** Entre colonnes de la grille (px) */
  columnGapPx: 0.5,
  /** Pastille de lecture (px) */
  knobSizePx: 8,
  barMaxWidthPx: 2,
  colors: {
    knob: '#6f7b82',
    /** Barres déjà lues */
    barPlayed: '#8aa08d',
    /** Barres à venir */
    barUnplayed: '#bfcfc2',
    ink: '#111b21',
    secondary: '#667781',
    playIcon: '#54656f',
  },
};

/**
 * @param {number} currentSec
 * @param {number} totalSec
 * @returns {number} entre 0 et 1
 */
export function getProgress01(currentSec, totalSec) {
  const t = Number.isFinite(totalSec) && totalSec > 0 ? totalSec : 1e-6;
  const c = Number.isFinite(currentSec) && currentSec >= 0 ? currentSec : 0;
  return Math.min(1, Math.max(0, c / t));
}

/**
 * Barre i (0..n-1) : centre à (i+0.5)/n — cohérent avec grille colonnes égales.
 */
export function isBarPlayed(barIndex, barCount, progress01) {
  if (barCount <= 0) return false;
  const center = (barIndex + 0.5) / barCount;
  return progress01 >= center;
}

/**
 * Seek depuis clientX : même zone utile que la pastille (padding inclus).
 */
export function seekRatioFromClientX(clientX, trackRect, padPx) {
  const inner = Math.max(1, trackRect.width - 2 * padPx);
  const x = clientX - trackRect.left - padPx;
  return Math.min(1, Math.max(0, x / inner));
}
