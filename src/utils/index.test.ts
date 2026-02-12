import { describe, it, expect } from 'vitest';
import { createPageUrl, fixUrlEncoding, validateUrl, validateUrls } from './index';

describe('utils/index', () => {
  describe('createPageUrl', () => {
    it('returns path with leading slash', () => {
      expect(createPageUrl('Home')).toBe('/Home');
    });
    it('replaces spaces with hyphens', () => {
      expect(createPageUrl('About Us')).toBe('/About-Us');
    });
    it('handles single word', () => {
      expect(createPageUrl('Contact')).toBe('/Contact');
    });
  });

  describe('fixUrlEncoding', () => {
    it('returns url unchanged (NO-OP)', () => {
      const url = 'https://cdn.example.com/video.mp4';
      expect(fixUrlEncoding(url)).toBe(url);
    });
    it('returns url with special chars unchanged', () => {
      const url = 'https://cdn.example.com/Les%20sonink%C3%A9.mp4';
      expect(fixUrlEncoding(url)).toBe(url);
    });
  });

  describe('validateUrl', () => {
    it('does nothing for null/undefined', () => {
      expect(() => validateUrl(null)).not.toThrow();
      expect(() => validateUrl(undefined)).not.toThrow();
    });
    it('throws for base44 URL', () => {
      expect(() => validateUrl('https://base44.com/video')).toThrow(/URLs non autorisées/);
      expect(() => validateUrl('https://cdn.base44.com/video')).toThrow(/URLs non autorisées/);
    });
    it('uses custom field name', () => {
      expect(() => validateUrl('https://base44.com/x', 'Video')).toThrow(/Video/);
    });
    it('allows other URLs', () => {
      expect(() => validateUrl('https://cdn.afriwonder.com/video')).not.toThrow();
    });
  });

  describe('validateUrls', () => {
    it('does nothing for null/undefined/empty array', () => {
      expect(() => validateUrls(null)).not.toThrow();
      expect(() => validateUrls(undefined)).not.toThrow();
      expect(() => validateUrls([])).not.toThrow();
    });
    it('throws for base44 in array', () => {
      expect(() => validateUrls(['https://ok.com', 'https://base44.com/bad'])).toThrow(/index 1/);
    });
    it('uses custom field name', () => {
      expect(() => validateUrls(['https://base44.com/x'], 'Thumbnails')).toThrow(/Thumbnails/);
    });
    it('allows all valid URLs', () => {
      expect(() => validateUrls(['https://a.com', 'https://b.com'])).not.toThrow();
    });
  });
});
