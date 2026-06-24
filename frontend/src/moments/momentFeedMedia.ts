import { Platform } from 'react-native';
import { toAbsoluteMediaUrl } from '../utils/absoluteMediaUrl';
import {
  collectPostImageUrlsFromApi,
  momentPostIsDisplayable,
  isSkippableMomentMediaUrl,
} from './momentFeedMediaCore';

export {
  isSkippableMomentMediaUrl,
  isE2eTestAccountUser,
  momentPostIsDisplayable,
  collectMomentMediaUrls,
  momentRowIsDisplayable,
  rowImageUrl,
  parseImagesField,
} from './momentFeedMediaCore';

/** Chemins relatifs `/uploads/...` + http→https web (anciens posts). */
export function normalizeMomentFeedImageUrl(raw: string): string {
  let u = toAbsoluteMediaUrl(raw);
  if (!u) return '';
  if (u.startsWith('//')) u = `https:${u}`;
  if (Platform.OS === 'web' && /^http:\/\//i.test(u)) {
    if (!/localhost|127\.0\.0\.1/i.test(u)) {
      u = u.replace(/^http:\/\//i, 'https://');
    }
  }
  try {
    if (/%25[0-9A-Fa-f]{2}/i.test(u)) {
      const once = decodeURIComponent(u);
      if (once.length > 0 && once !== u) u = once;
    }
  } catch {
    /* garder u */
  }
  return u;
}

export function isLikelyRenderableMomentUrl(raw: string): boolean {
  const u = normalizeMomentFeedImageUrl(raw);
  if (!u || isSkippableMomentMediaUrl(u)) return false;
  return (
    /^https?:\/\//i.test(u)
    || u.startsWith('data:')
    || u.startsWith('blob:')
  );
}

export function collectPostImageUrls(p: Record<string, unknown>): string[] {
  return collectPostImageUrlsFromApi(p, normalizeMomentFeedImageUrl, isLikelyRenderableMomentUrl);
}
