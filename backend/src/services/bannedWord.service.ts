/**
 * Mots interdits (CPO 2.43) — filtrage commentaires
 */
import prisma from '../config/database.js';

let cachedWords: string[] = [];
let cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 min

/** Invalide le cache (à appeler après ajout/suppression/modification admin). */
export function invalidateBannedWordsCache() {
  cacheTs = 0;
}

export async function getActiveBannedWords(): Promise<string[]> {
  if (Date.now() - cacheTs < CACHE_TTL_MS && cachedWords.length >= 0) return cachedWords;
  const list = await prisma.bannedWord.findMany({
    where: { is_active: true },
    select: { word: true },
  });
  cachedWords = list.map((r) => r.word.trim().toLowerCase()).filter(Boolean);
  cacheTs = Date.now();
  return cachedWords;
}

/** Retourne true si le texte contient au moins un mot interdit (insensible à la casse). */
export async function containsBannedWord(text: string): Promise<boolean> {
  const words = await getActiveBannedWords();
  if (words.length === 0) return false;
  const lower = text.toLowerCase();
  return words.some((w) => {
    if (w.length < 2) return false;
    const idx = lower.indexOf(w);
    if (idx === -1) return false;
    const before = idx === 0 ? ' ' : lower[idx - 1];
    const after = lower[idx + w.length];
    const isWordBoundary = (c: string) => !/[\w\u00c0-\u024f]/.test(c);
    return isWordBoundary(before) && (after === undefined || isWordBoundary(after));
  });
}
