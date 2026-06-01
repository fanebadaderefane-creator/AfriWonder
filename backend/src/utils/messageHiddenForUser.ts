/** IDs utilisateurs ayant masqué un message « pour moi » (champ JSON Prisma). */

export function parseHiddenFromUserIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x || '').trim()).filter(Boolean);
}

export function withUserInHiddenList(existing: unknown, userId: string): string[] {
  const ids = parseHiddenFromUserIds(existing);
  if (!userId || ids.includes(userId)) return ids;
  return [...ids, userId];
}

export function isHiddenForUser(hiddenRaw: unknown, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return parseHiddenFromUserIds(hiddenRaw).includes(userId);
}
