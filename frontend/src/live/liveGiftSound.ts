import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { EXTENDED_GIFT_CATALOG } from './extendedGiftCatalog';
import { soundUriForGiftId } from './liveGiftSoundMap';

/**
 * Sons courts (HTTPS) par palier de montant — pas d’asset binaire dans le repo.
 * Désactivé sur web ; échoue silencieusement hors réseau.
 */
const TIER_URIS = [
  'https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-706.wav',
  'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.wav',
  'https://assets.mixkit.co/sfx/preview/mixkit-unlock-new-item-game-notification-254.wav',
];

function tierFromAmountXof(amountXof: number, combo: number): 0 | 1 | 2 {
  let t: 0 | 1 | 2 = 0;
  if (amountXof >= 1500) t = 1;
  if (amountXof >= 15000) t = 2;
  if (combo >= 4) t = Math.min(2, t + 1) as 0 | 1 | 2;
  return t;
}

function resolveAmountXof(giftId: string, totalAmountFallback: number): number {
  const row = EXTENDED_GIFT_CATALOG.find((g) => g.id === giftId);
  if (row) return row.amountXof;
  return totalAmountFallback > 0 ? totalAmountFallback : 100;
}

export async function playGiftReceiveSound(opts: {
  giftId: string;
  totalAmountXof: number;
  combo: number;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  const amountXof = resolveAmountXof(opts.giftId, opts.totalAmountXof);
  const tier = tierFromAmountXof(amountXof, opts.combo);
  const uri = soundUriForGiftId(opts.giftId) ?? TIER_URIS[tier];
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 0.42, isLooping: false });
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) void sound.unloadAsync();
    });
  } catch {
    /* réseau / lecture */
  }
}
