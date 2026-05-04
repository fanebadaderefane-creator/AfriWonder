import { describe, expect, it } from 'vitest';
import {
  buildArFrameProcessorOp,
  buildLiveAREffectColor,
  cameraPositionFor,
  visionCameraFlashFor,
} from './visionCameraEffects';

describe('visionCameraEffects', () => {
  it('cameraPositionFor mappe back/front sans surprise', () => {
    expect(cameraPositionFor('back')).toBe('back');
    expect(cameraPositionFor('front')).toBe('front');
  });

  it('visionCameraFlashFor mappe le cycle interne vers vision-camera (auto → off)', () => {
    expect(visionCameraFlashFor('off')).toBe('off');
    expect(visionCameraFlashFor('on')).toBe('on');
    // v4 startRecording n'accepte que on/off — auto est rabattu sur off par sécurité.
    expect(visionCameraFlashFor('auto')).toBe('off');
  });

  it('buildLiveAREffectColor renvoie null pour none', () => {
    expect(buildLiveAREffectColor('none')).toBeNull();
  });

  it('buildLiveAREffectColor renvoie une couleur RGBA cohérente par effet', () => {
    expect(buildLiveAREffectColor('lumiere_chaude')).toMatch(/^rgba\(255,170,80,/);
    expect(buildLiveAREffectColor('lissage_doux')).toMatch(/^rgba\(255,235,225,/);
    expect(buildLiveAREffectColor('ecran_vert')).toMatch(/^rgba\(0,255,80,/);
  });

  it('buildArFrameProcessorOp retourne noop pour none', () => {
    expect(buildArFrameProcessorOp('none')).toEqual({ kind: 'noop' });
  });

  it('buildArFrameProcessorOp retourne overlay pour lumiere_chaude / ecran_vert', () => {
    const chaud = buildArFrameProcessorOp('lumiere_chaude');
    expect(chaud.kind).toBe('overlay');
    if (chaud.kind === 'overlay') {
      expect(chaud.rgba).toEqual({ r: 255, g: 170, b: 80, a: 0.18 });
    }

    const vert = buildArFrameProcessorOp('ecran_vert');
    expect(vert.kind).toBe('overlay');
    if (vert.kind === 'overlay') {
      expect(vert.rgba.g).toBe(255);
      expect(vert.rgba.a).toBeGreaterThan(0);
      expect(vert.rgba.a).toBeLessThan(1);
    }
  });

  it('buildArFrameProcessorOp retourne blur pour lissage_doux', () => {
    const op = buildArFrameProcessorOp('lissage_doux');
    expect(op.kind).toBe('blur');
    if (op.kind === 'blur') {
      expect(op.sigma).toBe(6);
      expect(op.rgba).toBeDefined();
    }
  });
});
