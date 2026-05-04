export interface SubtitleChunk {
  /** Position dans la séquence (1-indexée pour SRT). */
  index: number;
  /** Début en millisecondes (≥ 0). */
  startMs: number;
  /** Fin en millisecondes (> startMs). */
  endMs: number;
  /** Texte affiché ; supporte plusieurs lignes. */
  text: string;
}

export interface SubtitleValidationError {
  index: number;
  reason: 'invalid_time' | 'overlap' | 'empty_text' | 'too_long';
}

const MAX_CHARS_PER_CHUNK = 240;

export function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function pad3(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(3, '0');
}

export function msToSrtTimestamp(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? Math.floor(ms) : 0;
  const h = Math.floor(safe / 3_600_000);
  const m = Math.floor((safe % 3_600_000) / 60_000);
  const s = Math.floor((safe % 60_000) / 1000);
  const frac = safe % 1000;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(frac)}`;
}

export function srtTimestampToMs(ts: string): number {
  const m = ts.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return Number.NaN;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = parseInt(m[4].padEnd(3, '0').slice(0, 3), 10);
  if ([h, min, sec, ms].some((v) => Number.isNaN(v))) return Number.NaN;
  return h * 3_600_000 + min * 60_000 + sec * 1000 + ms;
}

export function exportSrt(chunks: SubtitleChunk[]): string {
  const sorted = [...chunks].sort((a, b) => a.startMs - b.startMs);
  const lines: string[] = [];
  sorted.forEach((c, i) => {
    const idx = i + 1;
    lines.push(String(idx));
    lines.push(`${msToSrtTimestamp(c.startMs)} --> ${msToSrtTimestamp(c.endMs)}`);
    lines.push(c.text.trim());
    lines.push('');
  });
  return lines.join('\n').trim() + '\n';
}

const TIMING_LINE_REGEX = /^([\d:,.]+)\s*-->\s*([\d:,.]+)\s*$/;

export function parseSrt(input: string): SubtitleChunk[] {
  if (!input) return [];
  const text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = text.split(/\n{2,}/);
  const chunks: SubtitleChunk[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    if (lines.length === 0) continue;
    let cursor = 0;
    if (/^\d+$/.test(lines[0].trim())) cursor = 1;
    if (cursor >= lines.length) continue;
    const timing = lines[cursor].match(TIMING_LINE_REGEX);
    if (!timing) continue;
    const startMs = srtTimestampToMs(timing[1]);
    const endMs = srtTimestampToMs(timing[2]);
    const body = lines.slice(cursor + 1).join('\n').trim();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    if (endMs <= startMs) continue;
    if (!body) continue;
    chunks.push({ index: chunks.length + 1, startMs, endMs, text: body });
  }
  return chunks;
}

export function validateChunks(chunks: SubtitleChunk[]): SubtitleValidationError[] {
  const errors: SubtitleValidationError[] = [];
  const sorted = [...chunks].sort((a, b) => a.startMs - b.startMs);
  for (let i = 0; i < sorted.length; i += 1) {
    const c = sorted[i];
    if (!Number.isFinite(c.startMs) || !Number.isFinite(c.endMs) || c.endMs <= c.startMs || c.startMs < 0) {
      errors.push({ index: c.index, reason: 'invalid_time' });
      continue;
    }
    if (!c.text || !c.text.trim()) {
      errors.push({ index: c.index, reason: 'empty_text' });
      continue;
    }
    if (c.text.length > MAX_CHARS_PER_CHUNK) {
      errors.push({ index: c.index, reason: 'too_long' });
    }
    const next = sorted[i + 1];
    if (next && c.endMs > next.startMs) {
      errors.push({ index: c.index, reason: 'overlap' });
    }
  }
  return errors;
}

export function clampChunk(chunk: SubtitleChunk, totalDurationMs: number | null): SubtitleChunk {
  const cap = Number.isFinite(totalDurationMs) && totalDurationMs! > 0 ? totalDurationMs! : null;
  let start = Math.max(0, Math.floor(chunk.startMs));
  let end = Math.max(start + 100, Math.floor(chunk.endMs));
  if (cap != null) {
    start = Math.min(start, Math.max(0, cap - 100));
    end = Math.min(end, cap);
    if (end <= start) end = start + 100;
  }
  return { ...chunk, startMs: start, endMs: end };
}
