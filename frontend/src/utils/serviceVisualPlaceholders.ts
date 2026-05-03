/**
 * Visuels de secours quand l’API ne fournit pas d’image (démo / dev / contenu partiel).
 * URLs publiques stables (Unsplash direct, pas de clé API).
 */

function hashToIndex(input: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? h % modulo : 0;
}

/** Concert, festival, conférence, etc. */
const EVENT_HERO_URLS = [
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=960&q=80',
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=960&q=80',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=960&q=80',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=960&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=960&q=80',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=960&q=80',
];

const PROPERTY_THUMB_URLS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
];

const NEWS_HERO_URLS = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=960&q=80',
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=960&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=960&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=960&q=80',
];

const DOCTOR_AVATAR_URLS = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
];

export function eventHeroPlaceholderUrl(eventId: string, eventType?: string): string {
  const key = `${eventType ?? 'event'}:${eventId}`;
  return EVENT_HERO_URLS[hashToIndex(key, EVENT_HERO_URLS.length)];
}

export function propertyThumbPlaceholderUrl(propertyId: string): string {
  return PROPERTY_THUMB_URLS[hashToIndex(propertyId, PROPERTY_THUMB_URLS.length)];
}

export function newsArticlePlaceholderUrl(articleId: string, category?: string): string {
  const key = `${category ?? 'news'}:${articleId}`;
  return NEWS_HERO_URLS[hashToIndex(key, NEWS_HERO_URLS.length)];
}

export function doctorAvatarPlaceholderUrl(doctorId: string): string {
  return DOCTOR_AVATAR_URLS[hashToIndex(doctorId, DOCTOR_AVATAR_URLS.length)];
}
