/** Multi-guest TikTok — max 8 invités vidéo (hôte en plus). */
export const MAX_LIVE_GUEST_SLOTS = 8;

export function nextGuestSlotIndex(used: number[]): number | null {
  const taken = new Set(used.filter((n) => n >= 0 && n < MAX_LIVE_GUEST_SLOTS));
  for (let i = 0; i < MAX_LIVE_GUEST_SLOTS; i += 1) {
    if (!taken.has(i)) return i;
  }
  return null;
}
