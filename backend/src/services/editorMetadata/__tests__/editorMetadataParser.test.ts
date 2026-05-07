import { hasEditorEffects, parseEditorMetadata } from '../editorMetadataParser.js';

describe('parseEditorMetadata', () => {
  it('renvoie les valeurs par défaut sur entrée vide / invalide', () => {
    const empty = parseEditorMetadata('');
    expect(empty.speed).toBe(1);
    expect(empty.trimStart).toBe(0);
    expect(empty.trimEnd).toBe(100);
    expect(empty.cameraEffect).toBe('none');
    expect(empty.voiceEffect).toBe('none');
    expect(empty.subtitles).toEqual([]);
    expect(empty.voiceOverUrl).toBeNull();

    expect(parseEditorMetadata(null).speed).toBe(1);
    expect(parseEditorMetadata(undefined).speed).toBe(1);
    expect(parseEditorMetadata('not-json').speed).toBe(1);
    expect(parseEditorMetadata('"string"').speed).toBe(1);
  });

  it('refuse les payloads > 16 ko (anti-DoS)', () => {
    const huge = JSON.stringify({ filler: 'x'.repeat(17_000) });
    const parsed = parseEditorMetadata(huge);
    expect(parsed.speed).toBe(1);
    expect(parsed.rawSize).toBeGreaterThan(16_000);
  });

  it('clampe la vitesse dans [0.25, 4]', () => {
    expect(parseEditorMetadata(JSON.stringify({ speed: 0.1 })).speed).toBe(0.25);
    expect(parseEditorMetadata(JSON.stringify({ speed: 99 })).speed).toBe(4);
    expect(parseEditorMetadata(JSON.stringify({ speed: 1.5 })).speed).toBe(1.5);
    expect(parseEditorMetadata(JSON.stringify({ speed: 'fast' })).speed).toBe(1);
  });

  it('clampe trimStart / trimEnd dans [0, 100]', () => {
    expect(parseEditorMetadata(JSON.stringify({ trimStart: -5 })).trimStart).toBe(0);
    expect(parseEditorMetadata(JSON.stringify({ trimEnd: 200 })).trimEnd).toBe(100);
  });

  it('valide les enums cameraEffect / voiceEffect (rejette les inconnus)', () => {
    expect(parseEditorMetadata(JSON.stringify({ cameraEffect: 'lissage_doux' })).cameraEffect).toBe('lissage_doux');
    expect(parseEditorMetadata(JSON.stringify({ cameraEffect: 'beauty_filter_pro' })).cameraEffect).toBe('none');
    expect(parseEditorMetadata(JSON.stringify({ voiceEffect: 'robot' })).voiceEffect).toBe('robot');
    expect(parseEditorMetadata(JSON.stringify({ voiceEffect: 'fake' })).voiceEffect).toBe('none');
  });

  it('accepte cameraEffect en forme objet { cameraEffect, serverFilterHint }', () => {
    const wrapped = JSON.stringify({
      cameraEffect: { cameraEffect: 'lumiere_chaude', serverFilterHint: 'curves=...' },
    });
    expect(parseEditorMetadata(wrapped).cameraEffect).toBe('lumiere_chaude');
  });

  it('filtre les sous-titres invalides (text vide, end<=start, NaN, > 200)', () => {
    const payload = JSON.stringify({
      subtitles: [
        { startMs: 0, endMs: 1000, text: 'OK' },
        { startMs: 2000, endMs: 1500, text: 'inverse' },
        { startMs: 3000, endMs: 4000, text: '   ' },
        { startMs: 'abc', endMs: 6000, text: 'NaN' },
        ...Array.from({ length: 250 }, (_, i) => ({
          startMs: 10_000 + i * 1000,
          endMs: 10_500 + i * 1000,
          text: `chunk_${i}`,
        })),
      ],
    });
    const parsed = parseEditorMetadata(payload);
    expect(parsed.subtitles.length).toBeLessThanOrEqual(200);
    expect(parsed.subtitles[0]).toEqual({ index: 1, startMs: 0, endMs: 1000, text: 'OK' });
    expect(parsed.subtitles.every((c) => c.endMs > c.startMs)).toBe(true);
    expect(parsed.subtitles.every((c) => c.text.trim().length > 0)).toBe(true);
  });

  it('rejette les voiceOverUrl non https/http', () => {
    expect(parseEditorMetadata(JSON.stringify({ voiceOverUrl: 'javascript:alert(1)' })).voiceOverUrl).toBeNull();
    expect(parseEditorMetadata(JSON.stringify({ voiceOverUrl: 'file:///etc/passwd' })).voiceOverUrl).toBeNull();
    expect(parseEditorMetadata(JSON.stringify({ voiceOverUrl: 'https://cdn.afri/voice.m4a' })).voiceOverUrl).toBe(
      'https://cdn.afri/voice.m4a',
    );
  });

  it('hasEditorEffects détecte un défaut sans effet', () => {
    expect(hasEditorEffects(parseEditorMetadata(''))).toBe(false);
    expect(hasEditorEffects(parseEditorMetadata(JSON.stringify({ speed: 1.5 })))).toBe(true);
    expect(hasEditorEffects(parseEditorMetadata(JSON.stringify({ cameraEffect: 'lissage_doux' })))).toBe(true);
    expect(
      hasEditorEffects(parseEditorMetadata(JSON.stringify({ subtitles: [{ startMs: 0, endMs: 1000, text: 'a' }] }))),
    ).toBe(true);
  });
});
