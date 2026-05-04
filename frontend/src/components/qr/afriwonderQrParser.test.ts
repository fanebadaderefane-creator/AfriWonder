import { describe, expect, it } from 'vitest';
import { isActionableQrCode, parseAfriWonderQrCode } from './afriwonderQrParser';

describe('parseAfriWonderQrCode', () => {
  it('renvoie unknown sur entrée vide / non string', () => {
    expect(parseAfriWonderQrCode('')).toEqual({ kind: 'unknown', raw: '' });
    expect(parseAfriWonderQrCode('   ')).toEqual({ kind: 'unknown', raw: '' });
    expect(parseAfriWonderQrCode(null)).toEqual({ kind: 'unknown', raw: '' });
    expect(parseAfriWonderQrCode(undefined)).toEqual({ kind: 'unknown', raw: '' });
    expect(parseAfriWonderQrCode(42)).toEqual({ kind: 'unknown', raw: '' });
  });

  it('parse afriwonder://user/:id (deeplink natif)', () => {
    expect(parseAfriWonderQrCode('afriwonder://user/abc123')).toEqual({
      kind: 'open_user_by_id',
      id: 'abc123',
    });
    expect(parseAfriWonderQrCode('AFRIWONDER://USER/Cap_Letters')).toEqual({
      kind: 'open_user_by_id',
      id: 'Cap_Letters',
    });
  });

  it('parse les URL web /user/:handle', () => {
    expect(parseAfriWonderQrCode('https://afri-wonder.vercel.app/user/bamako_chef')).toEqual({
      kind: 'open_user_by_handle',
      handle: 'bamako_chef',
    });
    expect(parseAfriWonderQrCode('https://afriwonder.com/user/abdoul.abdou')).toEqual({
      kind: 'open_user_by_handle',
      handle: 'abdoul.abdou',
    });
  });

  it('parse les URL avec _userId param (parcours legacy)', () => {
    expect(parseAfriWonderQrCode('https://x/?_userId=zzz77')).toEqual({
      kind: 'open_user_by_id',
      id: 'zzz77',
    });
  });

  it('priorise le deeplink afriwonder:// sur les autres formats', () => {
    expect(parseAfriWonderQrCode('afriwonder://user/A?_userId=B')).toEqual({
      kind: 'open_user_by_id',
      id: 'A',
    });
  });

  it("renvoie unknown sur un QR aléatoire (URL non AfriWonder)", () => {
    expect(parseAfriWonderQrCode('https://example.com/foo/bar').kind).toBe('unknown');
    expect(parseAfriWonderQrCode('plain text data').kind).toBe('unknown');
    expect(parseAfriWonderQrCode('mailto:test@x.com').kind).toBe('unknown');
  });

  it('clamp les inputs trop longs', () => {
    const huge = 'afriwonder://user/' + 'A'.repeat(8000);
    const out = parseAfriWonderQrCode(huge);
    expect(out.kind).toBe('open_user_by_id');
    if (out.kind === 'open_user_by_id') {
      expect(out.id.length).toBeLessThanOrEqual(4096);
    }
  });

  it('isActionableQrCode renvoie true pour les actions reconnues', () => {
    expect(isActionableQrCode({ kind: 'open_user_by_id', id: 'x' })).toBe(true);
    expect(isActionableQrCode({ kind: 'open_user_by_handle', handle: 'y' })).toBe(true);
    expect(isActionableQrCode({ kind: 'unknown', raw: 'z' })).toBe(false);
  });
});
