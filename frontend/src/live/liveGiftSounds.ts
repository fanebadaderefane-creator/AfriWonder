import { Audio } from 'expo-av';
import { Platform } from 'react-native';

const GIFT_DEFAULT = require('../../assets/sounds/gift_default.wav');
const GIFT_RARE = require('../../assets/sounds/gift_rare.wav');
const GIFT_LEGENDARY = require('../../assets/sounds/gift_legendary.wav');

let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady || Platform.OS === 'web') return;
  audioModeReady = true;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    /* ignore */
  }
}

function pickSrcForRarity(rarity?: string | null): number {
  const r = String(rarity || '').toLowerCase();
  if (r === 'legendary' || r === 'mythic') return GIFT_LEGENDARY;
  if (r === 'epic' || r === 'rare') return GIFT_RARE;
  return GIFT_DEFAULT;
}

function pickSrcFromGiftName(name?: string | null): number | null {
  const n = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!n) return null;
  if (/ferrari|yacht|jet|palais|galax|phoenix|légende|legende|diamant|couronne royale/.test(n)) return GIFT_LEGENDARY;
  if (/djemb|djembe|kora|dogon|lion|baobab|soleil|masque|éléphant|elephant|savane|afrique|african/.test(n)) return GIFT_RARE;
  if (/rose|cœur|coeur|pétale|petale|café|cafe|bière|biere|pizza/.test(n)) return GIFT_DEFAULT;
  return null;
}

/** Variante stable par `gift_id` (3 WAV) + secours rareté + nom catalogue (seed DB / emoji). */
export async function playGiftSoundForCatalog(
  giftId?: string | null,
  rarity?: string | null,
  giftName?: string | null,
): Promise<void> {
  if (Platform.OS === 'web') return;
  let src = pickSrcForRarity(rarity);
  const byName = pickSrcFromGiftName(giftName);
  if (byName != null) src = byName;
  const gid = String(giftId || '').trim();
  if (gid && byName == null) {
    let h = 0;
    for (let i = 0; i < gid.length; i++) h = (h * 31 + gid.charCodeAt(i)) | 0;
    const slot = Math.abs(h) % 3;
    src = slot === 0 ? GIFT_DEFAULT : slot === 1 ? GIFT_RARE : GIFT_LEGENDARY;
  }
  try {
    await ensureAudioMode();
    const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: true, volume: 0.88 });
    sound.setOnPlaybackStatusUpdate((st) => {
      if (st.isLoaded && st.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    /* ignore */
  }
}

/** B — court son selon la rareté du cadeau (WAV locaux, expo-av). */
export async function playGiftSoundForRarity(rarity?: string | null): Promise<void> {
  return playGiftSoundForCatalog(null, rarity);
}
