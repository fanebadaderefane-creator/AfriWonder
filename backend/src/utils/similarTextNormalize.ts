/**
 * Normalise pour comparer titres / descriptions / tags (recherche « similaires »).
 * Doit rester aligné sur la logique d’`extractContentKeywords` (sans accents, casse basse).
 */
export function normalizeSimilarText(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
