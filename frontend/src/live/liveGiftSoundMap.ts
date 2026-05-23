/**
 * Sons distincts par id de cadeau (URLs Mixkit preview — même CDN que liveGiftSound).
 * Les ids absents utilisent la logique par montant dans liveGiftSound.ts.
 */
const U = {
  tap: 'https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-706.wav',
  chime: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.wav',
  unlock: 'https://assets.mixkit.co/sfx/preview/mixkit-unlock-new-item-game-notification-254.wav',
  coin: 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.wav',
};

export const GIFT_ID_SOUND_URI: Partial<Record<string, string>> = {
  rose: U.tap,
  heart: U.tap,
  like: U.coin,
  cafe: U.tap,
  icecream: U.chime,
  djembe: U.coin,
  drum: U.coin,
  kora2: U.chime,
  mask_dogon: U.unlock,
  lion_sahel: U.chime,
  lion: U.chime,
  baobab2: U.tap,
  leaf: U.tap,
  soleil: U.chime,
  star: U.chime,
  flame: U.coin,
  diamond: U.unlock,
  crown: U.unlock,
  crown2: U.unlock,
  people: U.chime,
  kente: U.unlock,
  sparkles: U.chime,
  rocket: U.unlock,
  africa: U.chime,
  planet: U.unlock,
  ribbon: U.chime,
  car: U.coin,
  yacht: U.chime,
  castle: U.unlock,
  galaxy: U.unlock,
  phoenix: U.coin,
  legend: U.unlock,
  afrobeat: U.chime,
};

export function soundUriForGiftId(giftId: string): string | null {
  const id = String(giftId || '').trim();
  if (!id) return null;
  return GIFT_ID_SOUND_URI[id] ?? null;
}
