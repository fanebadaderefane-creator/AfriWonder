import { describe, expect, it } from 'vitest';
import {
  VOICE_EFFECT_OPTIONS,
  buildVoiceEffectPayload,
  isValidVoiceEffect,
  safeVoiceEffect,
} from './voiceEffects';

describe('voiceEffects', () => {
  it('expose les 5 effets attendus avec libellés / hints', () => {
    expect(VOICE_EFFECT_OPTIONS.map((o) => o.id)).toEqual(['none', 'robot', 'deep', 'high', 'echo']);
    for (const opt of VOICE_EFFECT_OPTIONS) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
      expect(typeof opt.hint).toBe('string');
      expect(opt.hint.length).toBeGreaterThan(0);
    }
  });

  it('isValidVoiceEffect rejette les inconnus', () => {
    expect(isValidVoiceEffect('robot')).toBe(true);
    expect(isValidVoiceEffect('echo')).toBe(true);
    expect(isValidVoiceEffect('fake')).toBe(false);
    expect(isValidVoiceEffect(undefined)).toBe(false);
    expect(isValidVoiceEffect(123)).toBe(false);
  });

  it('safeVoiceEffect ramène toute valeur invalide vers "none"', () => {
    expect(safeVoiceEffect('robot')).toBe('robot');
    expect(safeVoiceEffect('xx')).toBe('none');
    expect(safeVoiceEffect(null)).toBe('none');
  });

  it('buildVoiceEffectPayload produit un payload sérialisable + hint serveur', () => {
    const none = buildVoiceEffectPayload('none');
    expect(none).toEqual({ voiceEffect: 'none', serverFilterHint: null });

    const robot = buildVoiceEffectPayload('robot');
    expect(robot.voiceEffect).toBe('robot');
    expect(typeof robot.serverFilterHint).toBe('string');
    expect(robot.serverFilterHint).toContain('asetrate');

    const deep = buildVoiceEffectPayload('deep');
    expect(deep.serverFilterHint).toContain('asetrate=44100*0.78');

    const high = buildVoiceEffectPayload('high');
    expect(high.serverFilterHint).toContain('asetrate=44100*1.25');

    const echo = buildVoiceEffectPayload('echo');
    expect(echo.serverFilterHint).toContain('aecho');
  });

  it('payloads ronds-trip JSON sans perte', () => {
    for (const opt of VOICE_EFFECT_OPTIONS) {
      const payload = buildVoiceEffectPayload(opt.id);
      const round = JSON.parse(JSON.stringify(payload));
      expect(round.voiceEffect).toBe(opt.id);
    }
  });
});
