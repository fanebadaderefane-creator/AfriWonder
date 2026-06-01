import { describe, expect, it, vi } from 'vitest';

vi.mock('./absoluteMediaUrl', () => ({
  toAbsoluteMediaUrl: (u: string) => u,
}));

import { isProgressiveVideoUrl, pickProgressivePlaybackUrl } from './pickProgressivePlaybackUrl';

describe('pickProgressivePlaybackUrl', () => {
  it('rejette HLS pour le cache hors-ligne', () => {
    expect(isProgressiveVideoUrl('https://cdn.example.com/v.m3u8')).toBe(false);
    expect(isProgressiveVideoUrl('https://cdn.example.com/v.mp4')).toBe(true);
  });

  it('privilégie la variante basse pour le cache', () => {
    const url = pickProgressivePlaybackUrl({
      low_quality_playback_url: 'https://cdn.example.com/low.mp4',
      video_url: 'https://cdn.example.com/hd.mp4',
      hls_url: 'https://cdn.example.com/hd.m3u8',
    });
    expect(url).toContain('low.mp4');
  });
});
