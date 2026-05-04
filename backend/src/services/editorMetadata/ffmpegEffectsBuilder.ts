/**
 * Construit les fragments de filtres ffmpeg à partir d'une `ParsedEditorMetadata`.
 *
 * Sécurité : le builder n'accepte JAMAIS de chaînes brutes — il mappe des
 * énumérations (`cameraEffect`, `voiceEffect`) vers des chaînes ffmpeg connues.
 * Les seules valeurs dynamiques (timestamps SRT, sigma blur) passent par des
 * fonctions de sérialisation explicites.
 */

import type {
  CameraEffectId,
  ParsedEditorMetadata,
  ParsedSubtitleChunk,
  VoiceEffectId,
} from './editorMetadataParser.js';

export interface FfmpegEffectPlan {
  /** Filtres vidéo à insérer avant `split=3[v1][v2][v3]`. */
  videoFilters: string[];
  /** Filtres audio à appliquer sur `[0:a]` (ou `[mixed_a]` si voice-over). */
  audioFilters: string[];
  /** Trim brut (en pourcentage 0..100) — à appliquer dans une 1re passe ou via `setpts`. */
  trimStartPct: number;
  trimEndPct: number;
  speed: number;
  /** Contenu SRT prêt à écrire sur disque pour `-vf subtitles=...`. */
  subtitleSrt: string | null;
  /** URL distante d'une voix off à mixer (si présente). */
  voiceOverUrl: string | null;
  /** Indique si au moins un filtre éditeur est à appliquer. */
  hasAnyEffect: boolean;
}

const CAMERA_VIDEO_FILTERS: Record<CameraEffectId, string[]> = {
  none: [],
  lissage_doux: ['gblur=sigma=1.4:steps=2', 'unsharp=5:5:0.6'],
  lumiere_chaude: [
    "curves=red='0/0.05 0.5/0.55 1/1':green='0/0 0.5/0.5 1/0.95':blue='0/0 0.5/0.45 1/0.85'",
    'eq=saturation=1.05',
  ],
  ecran_vert: ['chromakey=0x00ff00:0.18:0.05'],
};

const VOICE_AUDIO_FILTERS: Record<VoiceEffectId, string[]> = {
  none: [],
  robot: ['asetrate=44100*0.85', 'aresample=44100', 'atempo=1.0', 'vibrato=f=8:d=0.5'],
  deep: ['asetrate=44100*0.78', 'aresample=44100', 'atempo=1.28'],
  high: ['asetrate=44100*1.25', 'aresample=44100', 'atempo=0.8'],
  echo: ['aecho=0.8:0.88:60:0.4'],
};

/**
 * Décompose une vitesse en chaîne `atempo` (chaque atempo doit être ∈ [0.5, 2]).
 * Exemple : speed=3 → ['atempo=2', 'atempo=1.5'].
 */
export function buildAtempoChain(speed: number): string[] {
  if (!Number.isFinite(speed) || speed <= 0) return [];
  if (speed === 1) return [];
  let remaining = speed;
  const out: string[] = [];
  // pour ralentir : 0.5 par 0.5 jusqu'à atteindre la valeur
  while (remaining < 0.5 && out.length < 10) {
    out.push('atempo=0.5');
    remaining = remaining / 0.5;
  }
  while (remaining > 2 && out.length < 10) {
    out.push('atempo=2.0');
    remaining = remaining / 2;
  }
  if (Math.abs(remaining - 1) > 0.001) {
    out.push(`atempo=${remaining.toFixed(3)}`);
  }
  return out;
}

function srtTimestamp(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  const frac = safe % 1000;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(frac)}`;
}

export function buildSubtitleSrt(chunks: ParsedSubtitleChunk[]): string {
  const sorted = [...chunks].sort((a, b) => a.startMs - b.startMs);
  const lines: string[] = [];
  sorted.forEach((c, i) => {
    const idx = i + 1;
    const text = c.text.replace(/\r/g, '').slice(0, 240).trim();
    if (!text) return;
    if (c.endMs <= c.startMs) return;
    lines.push(String(idx));
    lines.push(`${srtTimestamp(c.startMs)} --> ${srtTimestamp(c.endMs)}`);
    lines.push(text);
    lines.push('');
  });
  return lines.length > 0 ? lines.join('\n').trim() + '\n' : '';
}

/**
 * Construit le plan d'effets ffmpeg à partir d'une métadata éditeur déjà parsée.
 * Pure : ne touche pas le système de fichiers, ne lance pas ffmpeg.
 */
export function buildFfmpegEffectPlan(parsed: ParsedEditorMetadata): FfmpegEffectPlan {
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];

  videoFilters.push(...CAMERA_VIDEO_FILTERS[parsed.cameraEffect]);

  if (parsed.speed !== 1 && Number.isFinite(parsed.speed)) {
    videoFilters.push(`setpts=PTS/${parsed.speed.toFixed(4)}`);
    audioFilters.push(...buildAtempoChain(parsed.speed));
  }

  audioFilters.push(...VOICE_AUDIO_FILTERS[parsed.voiceEffect]);

  const subtitleSrt = parsed.subtitles.length > 0 ? buildSubtitleSrt(parsed.subtitles) : null;

  const hasAnyEffect =
    videoFilters.length > 0 ||
    audioFilters.length > 0 ||
    Boolean(subtitleSrt) ||
    Boolean(parsed.voiceOverUrl) ||
    parsed.trimStart !== 0 ||
    parsed.trimEnd !== 100;

  return {
    videoFilters,
    audioFilters,
    trimStartPct: parsed.trimStart,
    trimEndPct: parsed.trimEnd,
    speed: parsed.speed,
    subtitleSrt,
    voiceOverUrl: parsed.voiceOverUrl,
    hasAnyEffect,
  };
}

/**
 * Joint des filtres ffmpeg en une seule chaîne `vf=...` ou `af=...` séparée par
 * des virgules (échappement NON requis ici : on ne concatène que des littéraux
 * connus du builder).
 */
export function joinFilters(filters: string[]): string {
  return filters.filter(Boolean).join(',');
}

/**
 * Construit le préfixe de filtre vidéo pour le pipeline HLS multi-bitrate.
 * Renvoie une chaîne du type `[0:v]<filtres>,subtitles=path.srt[base]` qui
 * remplace l'entrée `[0:v]` du `filter_complex` HLS standard.
 */
export function buildVideoFilterPrefix(
  plan: FfmpegEffectPlan,
  options: { subtitlePath: string | null } = { subtitlePath: null },
): string {
  const parts = [...plan.videoFilters];
  if (plan.subtitleSrt && options.subtitlePath) {
    // Sanitize chemin : retirer apostrophes / backslashes interprétés par ffmpeg
    const safe = options.subtitlePath.replace(/['"\\]/g, '');
    parts.push(`subtitles='${safe}'`);
  }
  if (parts.length === 0) return '';
  return parts.join(',');
}
