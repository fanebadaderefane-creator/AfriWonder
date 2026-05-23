/** Constantes et normalisation des sondages (DM + groupes). */

export const GROUP_POLL_MIN_OPTIONS = 2;
export const GROUP_POLL_MAX_OPTIONS = 10;
export const GROUP_POLL_MAX_OPTION_LEN = 200;
export const GROUP_POLL_MAX_QUESTION_LEN = 500;

export function normalizePollOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = String(item ?? '')
      .trim()
      .slice(0, GROUP_POLL_MAX_OPTION_LEN);
    if (s) out.push(s);
    if (out.length >= GROUP_POLL_MAX_OPTIONS) break;
  }
  return out;
}
