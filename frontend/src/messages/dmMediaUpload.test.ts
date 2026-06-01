import { describe, expect, it } from 'vitest';

/** Copie pure de la logique MIME — testable sans Expo natif. */
function normalizeDmUploadMime(
  mime: string | null | undefined,
  kind: 'image' | 'video' | 'audio' | 'document',
  fileName?: string | null,
): string {
  let m = String(mime || '').toLowerCase().trim();
  if (m === 'image/jpg') m = 'image/jpeg';
  if (m === 'audio/m4a' || m === 'audio/x-m4a') m = 'audio/mp4';
  const ext = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!m || m === 'application/octet-stream' || m === 'binary/octet-stream') {
    if (kind === 'image') return ext === 'png' ? 'image/png' : 'image/jpeg';
    if (kind === 'video') return ext === 'webm' ? 'video/webm' : 'video/mp4';
    if (kind === 'audio') return ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4';
    return ext === 'pdf' ? 'application/pdf' : 'application/pdf';
  }
  return m;
}

describe('normalizeDmUploadMime', () => {
  it('maps audio/m4a to audio/mp4', () => {
    expect(normalizeDmUploadMime('audio/m4a', 'audio')).toBe('audio/mp4');
  });

  it('infers jpeg from octet-stream photo filename', () => {
    expect(normalizeDmUploadMime('application/octet-stream', 'image', 'photo_123.jpg')).toBe('image/jpeg');
  });

  it('infers mp4 video from octet-stream', () => {
    expect(normalizeDmUploadMime('', 'video', 'clip.mp4')).toBe('video/mp4');
  });
});
