import { describe, expect, it } from 'vitest';
import {
  clampChunk,
  exportSrt,
  msToSrtTimestamp,
  parseSrt,
  srtTimestampToMs,
  validateChunks,
  type SubtitleChunk,
} from './subtitles';

describe('subtitles helpers', () => {
  it('msToSrtTimestamp formate au format SRT (HH:MM:SS,mmm)', () => {
    expect(msToSrtTimestamp(0)).toBe('00:00:00,000');
    expect(msToSrtTimestamp(1234)).toBe('00:00:01,234');
    expect(msToSrtTimestamp(60_000)).toBe('00:01:00,000');
    expect(msToSrtTimestamp(3_661_500)).toBe('01:01:01,500');
    expect(msToSrtTimestamp(-5)).toBe('00:00:00,000');
    expect(msToSrtTimestamp(NaN)).toBe('00:00:00,000');
  });

  it('srtTimestampToMs accepte virgule ou point', () => {
    expect(srtTimestampToMs('00:00:00,000')).toBe(0);
    expect(srtTimestampToMs('00:01:30,500')).toBe(90_500);
    expect(srtTimestampToMs('01:00:00.250')).toBe(3_600_250);
    expect(Number.isNaN(srtTimestampToMs('not a time'))).toBe(true);
  });

  it('exportSrt → parseSrt round-trip préserve les chunks valides', () => {
    const chunks: SubtitleChunk[] = [
      { index: 1, startMs: 0, endMs: 1500, text: 'Bonjour AfriWonder' },
      { index: 2, startMs: 2000, endMs: 4500, text: 'Ligne 1\nLigne 2' },
    ];
    const srt = exportSrt(chunks);
    expect(srt).toContain('00:00:00,000 --> 00:00:01,500');
    expect(srt).toContain('00:00:02,000 --> 00:00:04,500');
    const parsed = parseSrt(srt);
    expect(parsed).toEqual([
      { index: 1, startMs: 0, endMs: 1500, text: 'Bonjour AfriWonder' },
      { index: 2, startMs: 2000, endMs: 4500, text: 'Ligne 1\nLigne 2' },
    ]);
  });

  it('parseSrt ignore les blocs invalides (timestamps cassés / vide)', () => {
    const broken = `1\n00:00:00,000 --> 00:00:00,500\nOK\n\n2\nbroken\nplop\n\n3\n00:00:01,000 --> 00:00:00,500\noverlap\n`;
    const parsed = parseSrt(broken);
    expect(parsed).toEqual([{ index: 1, startMs: 0, endMs: 500, text: 'OK' }]);
  });

  it('validateChunks détecte chevauchement / temps invalide / texte vide / trop long', () => {
    const errors = validateChunks([
      { index: 1, startMs: 0, endMs: 1000, text: 'Premier' },
      { index: 2, startMs: 800, endMs: 2000, text: 'Chevauche' },
      { index: 3, startMs: 3000, endMs: 2900, text: 'Inversé' },
      { index: 4, startMs: 4000, endMs: 5000, text: '   ' },
      { index: 5, startMs: 6000, endMs: 7000, text: 'x'.repeat(300) },
    ]);
    const reasons = errors.map((e) => e.reason).sort();
    expect(reasons).toContain('overlap');
    expect(reasons).toContain('invalid_time');
    expect(reasons).toContain('empty_text');
    expect(reasons).toContain('too_long');
  });

  it('clampChunk respecte la durée totale', () => {
    const c: SubtitleChunk = { index: 1, startMs: 9_500, endMs: 12_000, text: 'fin' };
    const out = clampChunk(c, 10_000);
    expect(out.startMs).toBeLessThanOrEqual(9_900);
    expect(out.endMs).toBeLessThanOrEqual(10_000);
    expect(out.endMs).toBeGreaterThan(out.startMs);
  });

  it('clampChunk garantit endMs > startMs', () => {
    const c: SubtitleChunk = { index: 1, startMs: 5_000, endMs: 4_000, text: 'mauvais ordre' };
    const out = clampChunk(c, null);
    expect(out.endMs).toBeGreaterThan(out.startMs);
  });
});
