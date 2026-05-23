import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'afw_live_video_quality_v1';

export type LiveVideoQuality = 'auto' | '360p' | '540p' | '720p';

export const LIVE_VIDEO_QUALITY_OPTIONS: { id: LiveVideoQuality; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: '360p', label: '360p' },
  { id: '540p', label: '540p' },
  { id: '720p', label: '720p HD' },
];

export function parseLiveVideoQuality(raw: string | null | undefined): LiveVideoQuality {
  if (raw === '360p' || raw === '540p' || raw === '720p' || raw === 'auto') return raw;
  return 'auto';
}

/** Dimensions portrait (caméra avant) pour encodage hôte */
export function getLiveEncoderDimensions(quality: LiveVideoQuality): { width: number; height: number; bitrate: number } {
  switch (quality) {
    case '360p':
      return { width: 360, height: 640, bitrate: 650 };
    case '540p':
      return { width: 540, height: 960, bitrate: 1200 };
    case '720p':
      return { width: 720, height: 1280, bitrate: 1800 };
    default:
      return { width: 720, height: 1280, bitrate: 1500 };
  }
}

export async function loadStoredLiveVideoQuality(): Promise<LiveVideoQuality> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return parseLiveVideoQuality(v);
  } catch {
    return 'auto';
  }
}

export async function saveStoredLiveVideoQuality(q: LiveVideoQuality): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, q);
  } catch {
    /* ignore */
  }
}
