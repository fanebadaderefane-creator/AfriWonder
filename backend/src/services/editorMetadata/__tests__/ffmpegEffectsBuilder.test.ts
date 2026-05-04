import {
  buildAtempoChain,
  buildFfmpegEffectPlan,
  buildSubtitleSrt,
  buildVideoFilterPrefix,
  joinFilters,
} from '../ffmpegEffectsBuilder.js';
import { parseEditorMetadata } from '../editorMetadataParser.js';

describe('buildAtempoChain', () => {
  it('renvoie [] pour speed=1 ou invalide', () => {
    expect(buildAtempoChain(1)).toEqual([]);
    expect(buildAtempoChain(0)).toEqual([]);
    expect(buildAtempoChain(NaN)).toEqual([]);
  });

  it('décompose les speeds > 2 en plusieurs atempo (max 2 chacun)', () => {
    const chain = buildAtempoChain(3);
    expect(chain[0]).toBe('atempo=2.0');
    expect(chain[chain.length - 1]).toContain('atempo=');
  });

  it('décompose les speeds < 0.5 en plusieurs atempo (min 0.5 chacun)', () => {
    const chain = buildAtempoChain(0.25);
    expect(chain[0]).toBe('atempo=0.5');
    expect(chain.length).toBeGreaterThanOrEqual(1);
  });
});

describe('buildSubtitleSrt', () => {
  it('exporte des chunks valides au format SRT', () => {
    const out = buildSubtitleSrt([
      { index: 1, startMs: 0, endMs: 1500, text: 'Bonjour AfriWonder' },
      { index: 2, startMs: 2000, endMs: 4500, text: 'Salutation' },
    ]);
    expect(out).toContain('00:00:00,000 --> 00:00:01,500');
    expect(out).toContain('Bonjour AfriWonder');
    expect(out).toContain('00:00:02,000 --> 00:00:04,500');
  });

  it('saute les chunks invalides', () => {
    const out = buildSubtitleSrt([
      { index: 1, startMs: 1000, endMs: 500, text: 'inverse' },
      { index: 2, startMs: 0, endMs: 1000, text: '' },
      { index: 3, startMs: 2000, endMs: 3000, text: 'Bon' },
    ]);
    expect(out).toContain('Bon');
    expect(out).not.toContain('inverse');
  });

  it('renvoie chaîne vide si aucun chunk valide', () => {
    expect(buildSubtitleSrt([])).toBe('');
    expect(buildSubtitleSrt([{ index: 1, startMs: 100, endMs: 50, text: 'x' }])).toBe('');
  });
});

describe('buildFfmpegEffectPlan', () => {
  it('aucun effet quand metadata par défaut', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(''));
    expect(plan.hasAnyEffect).toBe(false);
    expect(plan.videoFilters).toEqual([]);
    expect(plan.audioFilters).toEqual([]);
    expect(plan.subtitleSrt).toBeNull();
  });

  it('cameraEffect lissage_doux ajoute gblur + unsharp', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(JSON.stringify({ cameraEffect: 'lissage_doux' })));
    expect(plan.videoFilters.some((f) => f.startsWith('gblur'))).toBe(true);
    expect(plan.videoFilters.some((f) => f.startsWith('unsharp'))).toBe(true);
    expect(plan.hasAnyEffect).toBe(true);
  });

  it('cameraEffect lumiere_chaude ajoute curves + saturation', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(JSON.stringify({ cameraEffect: 'lumiere_chaude' })));
    expect(plan.videoFilters.some((f) => f.startsWith('curves'))).toBe(true);
    expect(plan.videoFilters.some((f) => f.includes('saturation'))).toBe(true);
  });

  it('cameraEffect ecran_vert ajoute chromakey', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(JSON.stringify({ cameraEffect: 'ecran_vert' })));
    expect(plan.videoFilters[0]).toContain('chromakey');
  });

  it('voiceEffect robot ajoute asetrate + vibrato', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(JSON.stringify({ voiceEffect: 'robot' })));
    expect(plan.audioFilters.some((f) => f.startsWith('asetrate'))).toBe(true);
    expect(plan.audioFilters.some((f) => f.startsWith('vibrato'))).toBe(true);
  });

  it('speed != 1 ajoute setpts vidéo + atempo audio', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(JSON.stringify({ speed: 2 })));
    expect(plan.videoFilters.some((f) => f.startsWith('setpts=PTS/'))).toBe(true);
    expect(plan.audioFilters.some((f) => f.startsWith('atempo'))).toBe(true);
  });

  it('subtitles non vides → SRT généré', () => {
    const plan = buildFfmpegEffectPlan(
      parseEditorMetadata(
        JSON.stringify({
          subtitles: [
            { startMs: 0, endMs: 1500, text: 'Salam' },
            { startMs: 2000, endMs: 3000, text: 'Mali' },
          ],
        }),
      ),
    );
    expect(plan.subtitleSrt).toContain('Salam');
    expect(plan.subtitleSrt).toContain('Mali');
    expect(plan.hasAnyEffect).toBe(true);
  });
});

describe('joinFilters / buildVideoFilterPrefix', () => {
  it('joinFilters ignore les vides', () => {
    expect(joinFilters([])).toBe('');
    expect(joinFilters(['gblur=sigma=1', '', 'unsharp=5:5:0.6'])).toBe('gblur=sigma=1,unsharp=5:5:0.6');
  });

  it('buildVideoFilterPrefix concatène vidéo + subtitles si chemin fourni', () => {
    const plan = buildFfmpegEffectPlan(
      parseEditorMetadata(
        JSON.stringify({
          cameraEffect: 'lissage_doux',
          subtitles: [{ startMs: 0, endMs: 1000, text: 'Hi' }],
        }),
      ),
    );
    const prefix = buildVideoFilterPrefix(plan, { subtitlePath: '/tmp/subs.srt' });
    expect(prefix).toContain('gblur');
    expect(prefix).toContain('unsharp');
    expect(prefix).toContain("subtitles='/tmp/subs.srt'");
  });

  it("buildVideoFilterPrefix sanitize les apostrophes / backslashes du path (pas dans le path interne)", () => {
    const plan = buildFfmpegEffectPlan(
      parseEditorMetadata(JSON.stringify({ subtitles: [{ startMs: 0, endMs: 1000, text: 'x' }] })),
    );
    const prefix = buildVideoFilterPrefix(plan, { subtitlePath: "/tmp/dir'with\\apos.srt" });
    // Le path interne ne doit plus contenir d'apostrophes ni de backslash
    const innerMatch = /subtitles='([^']*)'/.exec(prefix);
    expect(innerMatch).not.toBeNull();
    expect(innerMatch![1]).not.toContain("'");
    expect(innerMatch![1]).not.toContain('\\');
    expect(innerMatch![1]).toBe('/tmp/dirwithapos.srt');
  });

  it('buildVideoFilterPrefix renvoie chaîne vide si aucun filtre vidéo ni subs', () => {
    const plan = buildFfmpegEffectPlan(parseEditorMetadata(''));
    expect(buildVideoFilterPrefix(plan, { subtitlePath: null })).toBe('');
  });
});
