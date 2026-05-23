import { describe, expect, it } from 'vitest';
import {
  CAMERA_EFFECT_OPTIONS,
  buildCameraEffectPayload,
  describeCameraEffect,
  isValidCameraEffect,
  safeCameraEffect,
} from './cameraEffects';

describe('cameraEffects', () => {
  it('expose 4 effets (none, lissage_doux, lumiere_chaude, ecran_vert)', () => {
    expect(CAMERA_EFFECT_OPTIONS.map((o) => o.id)).toEqual([
      'none',
      'lissage_doux',
      'lumiere_chaude',
      'ecran_vert',
    ]);
  });

  it('chaque effet a un libellé et un hint non vides', () => {
    for (const opt of CAMERA_EFFECT_OPTIONS) {
      expect(opt.label.length).toBeGreaterThan(0);
      expect(opt.hint.length).toBeGreaterThan(0);
    }
  });

  it('isValidCameraEffect rejette les inconnus', () => {
    expect(isValidCameraEffect('lissage_doux')).toBe(true);
    expect(isValidCameraEffect('ecran_vert')).toBe(true);
    expect(isValidCameraEffect('beauté')).toBe(false);
    expect(isValidCameraEffect(undefined)).toBe(false);
  });

  it('safeCameraEffect retombe sur "none"', () => {
    expect(safeCameraEffect('lumiere_chaude')).toBe('lumiere_chaude');
    expect(safeCameraEffect('xx')).toBe('none');
    expect(safeCameraEffect(null)).toBe('none');
  });

  it('buildCameraEffectPayload expose un hint ffmpeg pour les effets non-none', () => {
    expect(buildCameraEffectPayload('none')).toEqual({ cameraEffect: 'none', serverFilterHint: null });
    expect(buildCameraEffectPayload('lissage_doux').serverFilterHint).toContain('gblur');
    expect(buildCameraEffectPayload('lumiere_chaude').serverFilterHint).toContain('curves');
    expect(buildCameraEffectPayload('ecran_vert').serverFilterHint).toContain('chromakey');
  });

  it("describeCameraEffect indique si le rendu est live ou en publication", () => {
    expect(describeCameraEffect('none')).toBe('');
    expect(describeCameraEffect('lumiere_chaude')).toContain('aperçu disponible');
    expect(describeCameraEffect('lissage_doux')).toContain('rendu serveur');
    expect(describeCameraEffect('ecran_vert')).toContain('rendu serveur');
  });

  it('payload est round-trip JSON safe', () => {
    for (const opt of CAMERA_EFFECT_OPTIONS) {
      const payload = buildCameraEffectPayload(opt.id);
      const round = JSON.parse(JSON.stringify(payload));
      expect(round.cameraEffect).toBe(opt.id);
    }
  });
});
