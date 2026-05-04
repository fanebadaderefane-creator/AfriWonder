import { describe, expect, it } from 'vitest';
import {
  buildRemixApiPayload,
  buildRemixDeepLinkParams,
  isValidRemixKind,
  normalizeRemixSeed,
  readRemixSeedFromParams,
  remixActionHint,
  remixActionLabel,
  safeRemixKind,
} from './remixSession';

describe('remixSession', () => {
  it('isValidRemixKind ne valide que duet / stitch / remix', () => {
    expect(isValidRemixKind('duet')).toBe(true);
    expect(isValidRemixKind('stitch')).toBe(true);
    expect(isValidRemixKind('remix')).toBe(true);
    expect(isValidRemixKind('duo')).toBe(false);
    expect(isValidRemixKind('')).toBe(false);
    expect(isValidRemixKind(undefined)).toBe(false);
  });

  it('safeRemixKind retombe sur remix par défaut', () => {
    expect(safeRemixKind('duet')).toBe('duet');
    expect(safeRemixKind('xx')).toBe('remix');
    expect(safeRemixKind(undefined, 'duet')).toBe('duet');
  });

  it('normalizeRemixSeed nettoie les inputs (et @ devant le username)', () => {
    expect(normalizeRemixSeed({ remixOfId: '   ', kind: 'duet' })).toBeNull();
    const seed = normalizeRemixSeed({
      remixOfId: ' v_123 ',
      kind: 'stitch',
      sourceCreatorUsername: '@bamako_chef',
      sourceTitle: 'Plat de la semaine',
    });
    expect(seed).toEqual({
      remixOfId: 'v_123',
      kind: 'stitch',
      sourceCreatorUsername: 'bamako_chef',
      sourceTitle: 'Plat de la semaine',
    });
  });

  it('normalizeRemixSeed rejette un id trop long', () => {
    expect(normalizeRemixSeed({ remixOfId: 'x'.repeat(70), kind: 'duet' })).toBeNull();
  });

  it('remixActionLabel + remixActionHint affichent du français', () => {
    expect(remixActionLabel('duet')).toBe('Duo');
    expect(remixActionLabel('stitch')).toBe('Collage');
    expect(remixActionLabel('remix')).toBe('Remix');
    expect(remixActionHint('duet')).toContain('côté');
    expect(remixActionHint('stitch')).toContain('extrait');
    expect(remixActionHint('remix')).toContain('vidéo');
  });

  it('buildRemixApiPayload mappe vers les noms snake_case attendus par le backend', () => {
    expect(buildRemixApiPayload(null)).toBeNull();
    const seed = normalizeRemixSeed({ remixOfId: 'v_42', kind: 'duet' });
    expect(buildRemixApiPayload(seed)).toEqual({ remix_of_id: 'v_42', remix_kind: 'duet' });
  });

  it('buildRemixDeepLinkParams produit les bons params', () => {
    const seed = normalizeRemixSeed({
      remixOfId: 'v_77',
      kind: 'stitch',
      sourceCreatorUsername: 'amadou',
      sourceTitle: 'Cours bambara',
    });
    expect(seed).not.toBeNull();
    const params = buildRemixDeepLinkParams(seed!);
    expect(params).toEqual({
      remix_of: 'v_77',
      remix_kind: 'stitch',
      remix_username: 'amadou',
      remix_title: 'Cours bambara',
    });
  });

  it('readRemixSeedFromParams accepte snake_case et camelCase', () => {
    expect(readRemixSeedFromParams({})).toBeNull();
    expect(
      readRemixSeedFromParams({
        remix_of: 'v_1',
        remix_kind: 'duet',
        remix_username: '@test',
      }),
    ).toEqual({
      remixOfId: 'v_1',
      kind: 'duet',
      sourceCreatorUsername: 'test',
      sourceTitle: null,
    });
    expect(
      readRemixSeedFromParams({
        remixOfId: 'v_2',
        remixKind: 'stitch',
      }),
    ).toEqual({
      remixOfId: 'v_2',
      kind: 'stitch',
      sourceCreatorUsername: null,
      sourceTitle: null,
    });
  });
});
