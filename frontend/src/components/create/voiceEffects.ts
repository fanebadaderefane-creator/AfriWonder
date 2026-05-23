export type VoiceEffectId = 'none' | 'robot' | 'deep' | 'high' | 'echo';

export interface VoiceEffectOption {
  id: VoiceEffectId;
  label: string;
  hint: string;
}

export const VOICE_EFFECT_OPTIONS: ReadonlyArray<VoiceEffectOption> = [
  { id: 'none', label: 'Original', hint: 'Voix brute' },
  { id: 'robot', label: 'Robot', hint: 'Voix robotique' },
  { id: 'deep', label: 'Grave', hint: 'Voix profonde' },
  { id: 'high', label: 'Aigu', hint: 'Voix aiguë' },
  { id: 'echo', label: 'Écho', hint: 'Effet d’écho' },
];

export function isValidVoiceEffect(v: unknown): v is VoiceEffectId {
  return typeof v === 'string' && VOICE_EFFECT_OPTIONS.some((o) => o.id === v);
}

export function safeVoiceEffect(v: unknown): VoiceEffectId {
  return isValidVoiceEffect(v) ? v : 'none';
}

/**
 * Métadonnées renvoyées au backend pour appliquer l'effet de voix avec ffmpeg.
 * On garde une couche d'abstraction pour ne pas faire fuir l'implémentation côté client.
 */
export function buildVoiceEffectPayload(effect: VoiceEffectId) {
  return {
    voiceEffect: effect,
    /** Hint au pipeline serveur — pas un contrat figé. */
    serverFilterHint:
      effect === 'robot'
        ? 'asetrate=44100*0.85,aresample=44100,atempo=1.0,vibrato=f=8:d=0.5'
        : effect === 'deep'
          ? 'asetrate=44100*0.78,aresample=44100,atempo=1.28'
          : effect === 'high'
            ? 'asetrate=44100*1.25,aresample=44100,atempo=0.8'
            : effect === 'echo'
              ? 'aecho=0.8:0.88:60:0.4'
              : null,
  };
}
