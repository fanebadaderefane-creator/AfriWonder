/**
 * Parser pur pour `Video.editor_metadata` (JSON sérialisé côté mobile par
 * `frontend/app/(tabs)/create.tsx::serializeEditorMetadata`).
 *
 * Objectif : transformer la chaîne brute (≤ 16 ko, contenu non fiable) en une
 * structure normalisée que le pipeline ffmpeg pourra consommer sans risque
 * (clamps, validation enum, garde-fous longueur).
 */

export type CameraEffectId = 'none' | 'lissage_doux' | 'lumiere_chaude' | 'ecran_vert';
export type VoiceEffectId = 'none' | 'robot' | 'deep' | 'high' | 'echo';

export interface ParsedSubtitleChunk {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export interface ParsedEditorMetadata {
  speed: number;
  trimStart: number;
  trimEnd: number;
  cameraEffect: CameraEffectId;
  voiceEffect: VoiceEffectId;
  subtitles: ParsedSubtitleChunk[];
  voiceOverUrl: string | null;
  /** Inclus tel quel pour debug — pas utilisé dans le builder. */
  rawSize: number;
}

const VALID_CAMERA_EFFECTS = new Set<CameraEffectId>([
  'none',
  'lissage_doux',
  'lumiere_chaude',
  'ecran_vert',
]);
const VALID_VOICE_EFFECTS = new Set<VoiceEffectId>(['none', 'robot', 'deep', 'high', 'echo']);

const MAX_RAW_BYTES = 16_000;
const MAX_SUBTITLE_CHUNKS = 200;
const MAX_SUBTITLE_TEXT = 240;
const MAX_VOICE_OVER_URL_LEN = 1024;

const DEFAULT: ParsedEditorMetadata = {
  speed: 1,
  trimStart: 0,
  trimEnd: 100,
  cameraEffect: 'none',
  voiceEffect: 'none',
  subtitles: [],
  voiceOverUrl: null,
  rawSize: 0,
};

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function safeCameraEffect(v: unknown): CameraEffectId {
  return typeof v === 'string' && VALID_CAMERA_EFFECTS.has(v as CameraEffectId)
    ? (v as CameraEffectId)
    : 'none';
}

function safeVoiceEffect(v: unknown): VoiceEffectId {
  return typeof v === 'string' && VALID_VOICE_EFFECTS.has(v as VoiceEffectId)
    ? (v as VoiceEffectId)
    : 'none';
}

function safeUrl(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_VOICE_OVER_URL_LEN) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function safeSubtitleChunks(v: unknown): ParsedSubtitleChunk[] {
  if (!Array.isArray(v)) return [];
  const out: ParsedSubtitleChunk[] = [];
  for (const raw of v.slice(0, MAX_SUBTITLE_CHUNKS)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const startMs = clampNumber(r.startMs, 0, 24 * 3_600_000, NaN);
    const endMs = clampNumber(r.endMs, 0, 24 * 3_600_000, NaN);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
    if (endMs <= startMs) continue;
    const text = typeof r.text === 'string' ? r.text.slice(0, MAX_SUBTITLE_TEXT).trim() : '';
    if (!text) continue;
    out.push({
      index: out.length + 1,
      startMs: Math.floor(startMs),
      endMs: Math.floor(endMs),
      text,
    });
  }
  return out;
}

/**
 * Parse une métadonnée éditeur. N'échoue jamais — renvoie des valeurs sûres
 * en cas d'erreur, et marque `rawSize` pour observabilité.
 */
export function parseEditorMetadata(input: string | null | undefined): ParsedEditorMetadata {
  if (!input || typeof input !== 'string') return { ...DEFAULT };
  const trimmed = input.trim();
  if (!trimmed) return { ...DEFAULT };
  if (trimmed.length > MAX_RAW_BYTES) return { ...DEFAULT, rawSize: trimmed.length };

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return { ...DEFAULT, rawSize: trimmed.length };
  }
  if (!json || typeof json !== 'object') return { ...DEFAULT, rawSize: trimmed.length };
  const obj = json as Record<string, unknown>;

  const cameraEffectRaw =
    obj.cameraEffect && typeof obj.cameraEffect === 'object'
      ? ((obj.cameraEffect as Record<string, unknown>).cameraEffect ?? null)
      : obj.cameraEffect;

  return {
    speed: clampNumber(obj.speed, 0.25, 4, 1),
    trimStart: clampNumber(obj.trimStart, 0, 100, 0),
    trimEnd: clampNumber(obj.trimEnd, 0, 100, 100),
    cameraEffect: safeCameraEffect(cameraEffectRaw),
    voiceEffect: safeVoiceEffect(obj.voiceEffect),
    subtitles: safeSubtitleChunks(obj.subtitles),
    voiceOverUrl: safeUrl(obj.voiceOverUrl),
    rawSize: trimmed.length,
  };
}

export function hasEditorEffects(parsed: ParsedEditorMetadata): boolean {
  return (
    parsed.speed !== 1 ||
    parsed.trimStart !== 0 ||
    parsed.trimEnd !== 100 ||
    parsed.cameraEffect !== 'none' ||
    parsed.voiceEffect !== 'none' ||
    parsed.subtitles.length > 0 ||
    Boolean(parsed.voiceOverUrl)
  );
}
