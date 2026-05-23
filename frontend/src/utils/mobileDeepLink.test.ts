import { describe, it, expect } from 'vitest';
import { normalizeIncomingMobileUrl, toAfriwonderResolveUrl } from './mobileDeepLink';

describe('mobileDeepLink', () => {
  it('normalizeIncomingMobileUrl strips Expo /--/ prefix', () => {
    expect(normalizeIncomingMobileUrl('exp://192.168.1.1:8081/--/afriwonder://video/abc')).toBe(
      'afriwonder://video/abc'
    );
  });

  it('toAfriwonderResolveUrl passes through afriwonder scheme', () => {
    expect(toAfriwonderResolveUrl('afriwonder://user/x')).toBe('afriwonder://user/x');
  });

  it('toAfriwonderResolveUrl passes through afriwonder://video/:id (Phase 10 deep link)', () => {
    expect(toAfriwonderResolveUrl('afriwonder://video/123')).toBe('afriwonder://video/123');
  });

  it('toAfriwonderResolveUrl maps relative watch path to video entity', () => {
    expect(toAfriwonderResolveUrl('/watch/vid-1')).toBe('afriwonder://video/vid-1');
  });

  it('toAfriwonderResolveUrl maps trusted https watch path', () => {
    expect(toAfriwonderResolveUrl('https://afri-wonder.vercel.app/watch/vid-2')).toBe(
      'afriwonder://video/vid-2'
    );
  });

  it('toAfriwonderResolveUrl ignores untrusted https hosts', () => {
    expect(toAfriwonderResolveUrl('https://evil.example/watch/vid')).toBeNull();
  });

  it('toAfriwonderResolveUrl maps trusted https hashtag path', () => {
    expect(toAfriwonderResolveUrl('https://afri-wonder.vercel.app/hashtag/AfriWonder')).toBe(
      'afriwonder://hashtag/AfriWonder'
    );
  });
});
