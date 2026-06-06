import { describe, it, expect, vi, afterEach } from 'vitest';
import { getBackendOrigin } from './backendBase';
import {
  getPublicWebOrigin,
  getVideoSharePageUrl,
  buildVideoSharePageUrl,
  isApiOnlyShareHost,
} from './shareUrls';

vi.mock('./backendBase', () => ({
  getBackendOrigin: vi.fn(() => 'http://localhost:3000'),
}));

describe('shareUrls', () => {
  afterEach(() => {
    vi.mocked(getBackendOrigin).mockReset();
    delete process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN;
    delete process.env.EXPO_PUBLIC_SHARE_FALLBACK_ORIGIN;
  });

  it('buildVideoSharePageUrl normalise et encode (/watch/:id)', () => {
    expect(buildVideoSharePageUrl('https://x.com/api/', 'abc')).toBe('https://x.com/watch/abc');
    expect(buildVideoSharePageUrl('https://app.test', 'id avec espace')).toBe(
      'https://app.test/watch/id%20avec%20espace'
    );
  });

  it('isApiOnlyShareHost détecte Render', () => {
    expect(isApiOnlyShareHost('https://afriwonder.onrender.com')).toBe(true);
    expect(isApiOnlyShareHost('https://afri-wonder.vercel.app')).toBe(false);
  });

  it('getPublicWebOrigin priorise EXPO_PUBLIC_PUBLIC_WEB_ORIGIN', () => {
    process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN = 'https://pwa.example.com/';
    vi.mocked(getBackendOrigin).mockReturnValue('http://localhost:3000');
    expect(getPublicWebOrigin()).toBe('https://pwa.example.com');
  });

  it('getPublicWebOrigin utilise l’origine API si elle n’est pas locale ni API-only', () => {
    vi.mocked(getBackendOrigin).mockReturnValue('https://api.production.com');
    expect(getPublicWebOrigin()).toBe('https://api.production.com');
  });

  it('getPublicWebOrigin ignore Render (API seule) → fallback PWA', () => {
    vi.mocked(getBackendOrigin).mockReturnValue('https://afriwonder.onrender.com');
    expect(getPublicWebOrigin()).toBe('https://afri-wonder.vercel.app');
  });

  it('getPublicWebOrigin enlève le suffixe /api sur l’origine API', () => {
    vi.mocked(getBackendOrigin).mockReturnValue('https://one-host.vercel.app/api');
    expect(getPublicWebOrigin()).toBe('https://one-host.vercel.app');
  });

  it('getPublicWebOrigin retombe sur le défaut si API locale', () => {
    vi.mocked(getBackendOrigin).mockReturnValue('http://localhost:3000');
    expect(getPublicWebOrigin()).toBe('https://afri-wonder.vercel.app');
  });

  it('getPublicWebOrigin utilise EXPO_PUBLIC_SHARE_FALLBACK_ORIGIN si API locale', () => {
    vi.mocked(getBackendOrigin).mockReturnValue('http://10.0.2.2:3000');
    process.env.EXPO_PUBLIC_SHARE_FALLBACK_ORIGIN = 'https://custom.share.app/';
    expect(getPublicWebOrigin()).toBe('https://custom.share.app');
  });

  it('getVideoSharePageUrl compose le chemin /watch/:id', () => {
    process.env.EXPO_PUBLIC_PUBLIC_WEB_ORIGIN = 'https://web.app';
    vi.mocked(getBackendOrigin).mockReturnValue('http://localhost:3000');
    expect(getVideoSharePageUrl('v1')).toBe('https://web.app/watch/v1');
  });
});
