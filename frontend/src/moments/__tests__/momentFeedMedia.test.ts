import { describe, expect, it } from 'vitest';
import {
  collectMomentMediaUrls,
  collectPostImageUrlsFromApi,
  isE2eTestAccountUser,
  isSkippableMomentMediaUrl,
  momentPostIsDisplayable,
  momentRowIsDisplayable,
} from '../momentFeedMediaCore';

describe('momentFeedMediaCore', () => {
  it('rejette example.com, cdn test et localhost', () => {
    expect(isSkippableMomentMediaUrl('https://example.com/x.jpg')).toBe(true);
    expect(isSkippableMomentMediaUrl('https://cdn.afriwonder.test/e2e.png')).toBe(true);
    expect(isSkippableMomentMediaUrl('http://127.0.0.1:3000/uploads/x.jpg')).toBe(true);
    expect(isSkippableMomentMediaUrl('/uploads/real.jpg')).toBe(false);
  });

  it('détecte compte E2E', () => {
    expect(isE2eTestAccountUser({ email: 'img.x@example.com', full_name: 'E2E img' })).toBe(true);
  });

  it('masque posts E2E même avec texte', () => {
    expect(momentRowIsDisplayable({
      text: 'E2E image publication',
      user: { email: 'img.x@example.com', full_name: 'E2E img' },
    })).toBe(false);
  });

  it('collecte image_url et images[]', () => {
    const urls = collectMomentMediaUrls({
      image_url: '/uploads/a.jpg',
      images: [{ image_url: '/uploads/b.jpg', position: 1 }],
    });
    expect(urls).toEqual(['/uploads/a.jpg', '/uploads/b.jpg']);
  });

  it('masque les posts image-only sans média valide', () => {
    expect(momentRowIsDisplayable({ text: '', image_url: 'https://example.com/x.jpg' })).toBe(false);
    expect(momentRowIsDisplayable({ text: 'Salut', image_url: 'https://example.com/x.jpg' })).toBe(true);
    expect(momentRowIsDisplayable({ text: '', image_url: '/uploads/ok.jpg' })).toBe(true);
  });

  it('collectPostImageUrlsFromApi avec normalize', () => {
    const urls = collectPostImageUrlsFromApi(
      { image_url: '/uploads/a.jpg' },
      (u) => `https://api.test${u}`,
      (u) => u.includes('/uploads/'),
    );
    expect(urls[0]).toBe('https://api.test/uploads/a.jpg');
  });

  it('momentPostIsDisplayable', () => {
    expect(momentPostIsDisplayable('', [])).toBe(false);
    expect(momentPostIsDisplayable('hello', [])).toBe(true);
  });
});
